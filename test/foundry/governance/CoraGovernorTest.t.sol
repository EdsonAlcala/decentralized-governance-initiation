//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";

import { CoraToken } from "contracts/governance/CoraToken.sol";
import { CoraGovernor } from "contracts/governance/CoraGovernor.sol";
import { GovernanceInitiationData } from "contracts/governance/GovernanceInitiationData.sol";
import { CoraTimelockController } from "contracts/governance/CoraTimelockController.sol";
import { GovernorTimelockControlConfigurable } from
  "contracts/governance/GovernorTimelockControlConfigurable.sol";
import "contracts/governance/GovernanceErrors.sol";

import { DummyDaoTargetTester } from "./mocks/DummyDaoTargetTester.sol";

import { BaseTest } from "../BaseTest.sol";

contract CoraGovernorTest is BaseTest {
  address immutable VOTER = makeAddr("voter 1");
  address immutable VOTER_2 = makeAddr("voter 2");
  address immutable GUY = makeAddr("a random guy");
  address immutable MESSAGE_RELAYER = makeAddr("message relayer");

  uint256 constant TIMELOCK_DELAY_LOW = 100;
  uint256 constant TIMELOCK_DELAY_DEFAULT = 200;
  uint256 constant TIMELOCK_DELAY_HIGH = 300;
  uint256 constant VOTING_DELAY = 1;
  uint256 constant VOTING_PERIOD = 30;
  uint256 constant PROPOSAL_THREESHOLD = 0;
  uint256 constant QUORUM_NUMERATOR = 400;

  uint256 constant VOTER_INITIAL_BALANCE = 10_000_000 ether;
  uint256 constant VOTER_2_INITIAL_BALANCE = 1_000_000 ether;
  uint256 constant TOKEN_SUPPLY = 100_000_000 ether;

  bytes4[] configuredSignatures;
  GovernorTimelockControlConfigurable.DelayType[] configuredDelays;

  GovernanceInitiationData initiationData;
  CoraTimelockController timelock;
  CoraToken token;
  DummyDaoTargetTester target;
  CoraGovernor governor;

  function setUp() public {
    _deployGovernor(
      TIMELOCK_DELAY_DEFAULT,
      TIMELOCK_DELAY_LOW,
      TIMELOCK_DELAY_HIGH,
      VOTING_DELAY,
      VOTING_PERIOD,
      PROPOSAL_THREESHOLD,
      QUORUM_NUMERATOR
    );
  }

  function testOnlyDaoCanUpdateMessageRelayerAddress() public {
    vm.expectRevert("Governor: onlyGovernance");
    governor.updateMessageRelayer(address(1));
  }

  function testCannotCreateProposalIfBalanceUnderThreshold() public {
    _deployGovernor(
      TIMELOCK_DELAY_DEFAULT,
      TIMELOCK_DELAY_LOW,
      TIMELOCK_DELAY_HIGH,
      VOTING_DELAY,
      VOTING_PERIOD,
      VOTER_INITIAL_BALANCE + 1,
      QUORUM_NUMERATOR
    );

    address[] memory targets = new address[](1);
    targets[0] = address(target);

    uint256[] memory values = new uint256[](1);
    values[0] = 0;
    bytes[] memory calldatas = new bytes[](1);
    calldatas[0] = abi.encodeWithSelector(DummyDaoTargetTester.lowFunction.selector, 40);

    vm.expectRevert("Governor: proposer votes below proposal threshold");
    vm.prank(VOTER);
    governor.propose(targets, values, calldatas, "");

    token.transfer(VOTER, 1);
    vm.prank(VOTER);
    token.delegate(VOTER);

    vm.prank(VOTER);
    _waitBlocks(1);
    governor.propose(targets, values, calldatas, "");
  }

  function testCannotQueueProposalIfVotedUnderThreshold() public {
    _deployGovernor(
      TIMELOCK_DELAY_DEFAULT,
      TIMELOCK_DELAY_LOW,
      TIMELOCK_DELAY_HIGH,
      VOTING_DELAY,
      VOTING_PERIOD,
      PROPOSAL_THREESHOLD,
      1100
    );

    address[] memory targets = new address[](1);
    targets[0] = address(target);

    uint256[] memory values = new uint256[](1);
    values[0] = 0;
    bytes[] memory calldatas = new bytes[](1);
    calldatas[0] = abi.encodeWithSelector(DummyDaoTargetTester.lowFunction.selector, 40);

    uint256 proposalId = governor.propose(targets, values, calldatas, "");

    _waitBlocks(VOTING_DELAY + 1);

    vm.prank(VOTER);
    governor.castVote(proposalId, uint8(GovernorCountingSimple.VoteType.For));

    _waitBlocks(VOTING_PERIOD);

    IGovernor.ProposalState state = governor.state(proposalId);

    assertEq(uint8(state), uint8(IGovernor.ProposalState.Defeated));

    // At this point, VOTER has 10_000_000 tokens, 10% of 100_000_000 which is the supply
    // the quorum numerator is 1100 (11%), so 11_000_000 tokens are needed for the proposal to be valid
    vm.expectRevert("Governor: proposal not successful");

    governor.queue(targets, values, calldatas, keccak256(bytes("")));
  }

  function testCanQueueProposalIfVotedOverThreshold() public {
    _deployGovernor(
      TIMELOCK_DELAY_DEFAULT,
      TIMELOCK_DELAY_LOW,
      TIMELOCK_DELAY_HIGH,
      VOTING_DELAY,
      VOTING_PERIOD,
      PROPOSAL_THREESHOLD,
      11
    );

    address[] memory targets = new address[](1);
    targets[0] = address(target);

    uint256[] memory values = new uint256[](1);
    values[0] = 0;
    bytes[] memory calldatas = new bytes[](1);
    calldatas[0] = abi.encodeWithSelector(DummyDaoTargetTester.lowFunction.selector, 40);

    uint256 proposalId = governor.propose(targets, values, calldatas, "");

    _waitBlocks(VOTING_DELAY + 1);

    vm.prank(VOTER);
    governor.castVote(proposalId, uint8(GovernorCountingSimple.VoteType.For));

    vm.prank(VOTER_2);
    governor.castVote(proposalId, uint8(GovernorCountingSimple.VoteType.For));

    _waitBlocks(VOTING_PERIOD);

    IGovernor.ProposalState state = governor.state(proposalId);

    assertEq(uint8(state), uint8(IGovernor.ProposalState.Succeeded));

    // At this point, VOTER has 1000 tokens, 10% of 10_000 which is the supply
    // VOTER_2 has 100 tokens, 1% of 10_000 which is the supply
    // the quorum numerator is 11 (11%), so 1100 tokens are needed for the proposal to be valid
    governor.queue(targets, values, calldatas, keccak256(bytes("")));
  }

  // can not create a proposal with HIGH delay type + another action
  function testInvalidProposal() public {
    vm.expectRevert(DaoInvalidProposal.selector);
    address[] memory targets = new address[](2);

    targets[0] = address(target);
    targets[1] = address(target);

    uint256[] memory values = new uint256[](2);
    values[0] = 0;
    values[1] = 0;

    bytes[] memory calldatas = new bytes[](2);
    calldatas[0] = abi.encodeWithSelector(DummyDaoTargetTester.highFunction.selector, 40);
    calldatas[1] = abi.encodeWithSelector(DummyDaoTargetTester.lowFunction.selector, 10);

    governor.propose(targets, values, calldatas, "");
  }

  // can not create a proposal with HIGH delay type + another action even using MessageRelayer
  function testInvalidProposalViaMessageRelayer() public {
    vm.expectRevert(DaoInvalidProposal.selector);
    address[] memory targets = new address[](2);

    targets[0] = address(MESSAGE_RELAYER);
    targets[1] = address(MESSAGE_RELAYER);

    uint256[] memory values = new uint256[](2);
    values[0] = 0;
    values[1] = 0;

    bytes[] memory calldatas = new bytes[](2);
    calldatas[0] = abi.encodeWithSignature(
      "sendMessage(string,string,bytes)",
      "destinationChain",
      "destinationAddress",
      abi.encodeWithSelector(DummyDaoTargetTester.highFunction.selector, 40)
    );
    calldatas[1] = abi.encodeWithSignature(
      "sendMessage(string,string,bytes)",
      "destinationChain",
      "destinationAddress",
      abi.encodeWithSelector(DummyDaoTargetTester.lowFunction.selector, 10)
    );

    governor.propose(targets, values, calldatas, "");
  }

  function testValidProposal() public {
    address[] memory targets = new address[](2);
    targets[0] = address(target);
    targets[1] = address(target);

    uint256[] memory values = new uint256[](2);
    values[0] = 0;
    values[1] = 0;

    bytes[] memory calldatas = new bytes[](2);
    calldatas[0] = abi.encodeWithSelector(DummyDaoTargetTester.lowFunction.selector, 40);
    calldatas[1] = abi.encodeWithSelector(DummyDaoTargetTester.lowFunction.selector, 10);

    uint256 expectedProposalId =
      uint256(keccak256(abi.encode(targets, values, calldatas, keccak256(bytes("")))));

    uint256 proposalId = governor.propose(targets, values, calldatas, "");
    assertEq(proposalId, expectedProposalId);
  }

  function testQueueLowDelayViaMessageRelayer() public {
    bytes memory targetCallData =
      abi.encodeWithSelector(DummyDaoTargetTester.lowFunction.selector, 10);
    bytes memory proposalCalldata = abi.encodeWithSignature(
      "sendMessage(string,string,bytes)", "destinationChain", "destinationAddress", targetCallData
    );

    address[] memory targets = new address[](1);
    targets[0] = address(MESSAGE_RELAYER);

    uint256[] memory values = new uint256[](1);
    values[0] = 0;
    bytes[] memory calldatas = new bytes[](1);
    calldatas[0] = proposalCalldata;

    uint256 proposalId = governor.propose(targets, values, calldatas, "");

    _waitBlocks(VOTING_DELAY + 1);

    vm.prank(VOTER);
    governor.castVote(proposalId, uint8(GovernorCountingSimple.VoteType.For));

    _waitBlocks(VOTING_PERIOD);

    governor.queue(targets, values, calldatas, keccak256(bytes("")));
    uint256 queuedTimestamp = block.timestamp;
    uint256 proposalEta = governor.proposalEta(proposalId);
    uint256 delay = proposalEta - queuedTimestamp;

    assertEq(delay, TIMELOCK_DELAY_LOW);
  }

  function testQueueLowDelay() public {
    uint256 dataBefore = target._lowData();

    bytes memory callD = abi.encodeWithSelector(DummyDaoTargetTester.lowFunction.selector, 10);
    uint256 delay = _proposeAndExecute(callD, TIMELOCK_DELAY_LOW, address(target));

    uint256 dataAfter = target._lowData();

    assertEq(delay, TIMELOCK_DELAY_LOW);
    assertEq(dataBefore, 0);
    assertEq(dataAfter, 10);
  }

  function testQueueLowDelayConfiguredAsLong() public {
    uint256 dataBefore = target._lowData();

    bytes4[] memory configuredSelectors = new bytes4[](1);
    configuredSelectors[0] = DummyDaoTargetTester.lowFunction.selector;

    bytes memory configureCallData = abi.encodeWithSelector(
      GovernorTimelockControlConfigurable.addDelayConfiguration.selector,
      configuredSelectors,
      new bytes4[](0),
      new bytes4[](0)
    );
    uint256 configureDelay =
      _proposeAndExecute(configureCallData, TIMELOCK_DELAY_HIGH, address(governor));

    bytes memory callD = abi.encodeWithSelector(DummyDaoTargetTester.lowFunction.selector, 10);
    uint256 delay = _proposeAndExecute(callD, TIMELOCK_DELAY_HIGH, address(target));

    uint256 dataAfter = target._lowData();

    assertEq(configureDelay, TIMELOCK_DELAY_HIGH);
    assertEq(delay, TIMELOCK_DELAY_HIGH);
    assertEq(dataBefore, 0);
    assertEq(dataAfter, 10);
  }

  function testQueueLowAfterModificationDelay() public {
    uint256 newLowDelay = 500;
    uint256 dataBefore = target._lowData();

    bytes memory configureLowDelayCalldata = abi.encodeWithSelector(
      GovernorTimelockControlConfigurable.updateShortDelay.selector, newLowDelay
    );
    uint256 configureDelay =
      _proposeAndExecute(configureLowDelayCalldata, TIMELOCK_DELAY_HIGH, address(governor));

    bytes memory callD = abi.encodeWithSelector(DummyDaoTargetTester.lowFunction.selector, 10);

    uint256 delay = _proposeAndExecute(callD, newLowDelay, address(target));

    uint256 dataAfter = target._lowData();

    assertEq(configureDelay, TIMELOCK_DELAY_HIGH); // all update*Delay functions are configured with HIGH delays by default
    assertEq(delay, newLowDelay);
    assertEq(dataBefore, 0);
    assertEq(dataAfter, 10);
  }

  function testQueueHighDelayViaMessageRelayer() public {
    bytes memory targetCallData =
      abi.encodeWithSelector(DummyDaoTargetTester.highFunction.selector, 10);
    bytes memory proposalCalldata = abi.encodeWithSignature(
      "sendMessage(string,string,bytes)", "destinationChain", "destinationAddress", targetCallData
    );

    address[] memory targets = new address[](1);
    targets[0] = address(MESSAGE_RELAYER);

    uint256[] memory values = new uint256[](1);
    values[0] = 0;
    bytes[] memory calldatas = new bytes[](1);
    calldatas[0] = proposalCalldata;

    uint256 proposalId = governor.propose(targets, values, calldatas, "");

    _waitBlocks(VOTING_DELAY + 1);

    vm.prank(VOTER);
    governor.castVote(proposalId, uint8(GovernorCountingSimple.VoteType.For));

    _waitBlocks(VOTING_PERIOD);

    governor.queue(targets, values, calldatas, keccak256(bytes("")));
    uint256 queuedTimestamp = block.timestamp;
    uint256 proposalEta = governor.proposalEta(proposalId);
    uint256 delay = proposalEta - queuedTimestamp;

    assertEq(delay, TIMELOCK_DELAY_HIGH);
  }

  function testQueueHighDelay() public {
    uint256 dataBefore = target._highData();

    bytes memory callD = abi.encodeWithSelector(DummyDaoTargetTester.highFunction.selector, 10);
    uint256 delay = _proposeAndExecute(callD, TIMELOCK_DELAY_HIGH, address(target));

    uint256 dataAfter = target._highData();

    assertEq(delay, TIMELOCK_DELAY_HIGH);
    assertEq(dataBefore, 0);
    assertEq(dataAfter, 10);
  }

  function testQueueHighDelayConfiguredAsLow() public {
    uint256 dataBefore = target._highData();

    bytes4[] memory configuredSelectors = new bytes4[](1);
    configuredSelectors[0] = DummyDaoTargetTester.highFunction.selector;

    bytes memory configureCallData = abi.encodeWithSelector(
      GovernorTimelockControlConfigurable.addDelayConfiguration.selector,
      new bytes4[](0),
      configuredSelectors,
      new bytes4[](0)
    );
    uint256 configureDelay =
      _proposeAndExecute(configureCallData, TIMELOCK_DELAY_HIGH, address(governor));

    bytes memory callD = abi.encodeWithSelector(DummyDaoTargetTester.highFunction.selector, 10);
    uint256 delay = _proposeAndExecute(callD, TIMELOCK_DELAY_LOW, address(target));

    uint256 dataAfter = target._highData();

    assertEq(configureDelay, TIMELOCK_DELAY_HIGH);
    assertEq(delay, TIMELOCK_DELAY_LOW);
    assertEq(dataBefore, 0);
    assertEq(dataAfter, 10);
  }

  function testQueueHighAfterModificationDelay() public {
    uint256 newLongDelay = 1000;
    uint256 dataBefore = target._highData();

    bytes memory configureLongDelayCalldata = abi.encodeWithSelector(
      GovernorTimelockControlConfigurable.updateLongDelay.selector, newLongDelay
    );
    uint256 configureDelay =
      _proposeAndExecute(configureLongDelayCalldata, TIMELOCK_DELAY_HIGH, address(governor));

    bytes memory callD = abi.encodeWithSelector(DummyDaoTargetTester.highFunction.selector, 10);

    uint256 delay = _proposeAndExecute(callD, newLongDelay, address(target));

    uint256 dataAfter = target._highData();

    assertEq(configureDelay, TIMELOCK_DELAY_HIGH); // all update*Delay functions are configured with HIGH delays by default
    assertEq(delay, newLongDelay);
    assertEq(dataBefore, 0);
    assertEq(dataAfter, 10);
  }

  function testQueueConfiguredDefaultDelayViaMessageRelayer() public {
    bytes memory targetCallData =
      abi.encodeWithSelector(DummyDaoTargetTester.normalFunction.selector, 10);
    bytes memory proposalCalldata = abi.encodeWithSignature(
      "sendMessage(string,string,bytes)", "destinationChain", "destinationAddress", targetCallData
    );

    address[] memory targets = new address[](1);
    targets[0] = address(MESSAGE_RELAYER);

    uint256[] memory values = new uint256[](1);
    values[0] = 0;
    bytes[] memory calldatas = new bytes[](1);
    calldatas[0] = proposalCalldata;

    uint256 proposalId = governor.propose(targets, values, calldatas, "");

    _waitBlocks(VOTING_DELAY + 1);

    vm.prank(VOTER);
    governor.castVote(proposalId, uint8(GovernorCountingSimple.VoteType.For));

    _waitBlocks(VOTING_PERIOD);

    governor.queue(targets, values, calldatas, keccak256(bytes("")));
    uint256 queuedTimestamp = block.timestamp;
    uint256 proposalEta = governor.proposalEta(proposalId);
    uint256 delay = proposalEta - queuedTimestamp;

    assertEq(delay, TIMELOCK_DELAY_DEFAULT);
  }

  function testQueueDefaultDelayConfigured() public {
    uint256 dataBefore = target._normalData();

    bytes memory callD = abi.encodeWithSelector(DummyDaoTargetTester.normalFunction.selector, 10);
    uint256 delay = _proposeAndExecute(callD, TIMELOCK_DELAY_DEFAULT, address(target));

    uint256 dataAfter = target._normalData();

    assertEq(delay, TIMELOCK_DELAY_DEFAULT);
    assertEq(dataBefore, 0);
    assertEq(dataAfter, 10);
  }

  function testQueueDefaultAfterModificationDelayConfigured() public {
    uint256 newDefaultDelay = 6000;
    uint256 dataBefore = target._normalData();

    bytes memory configureDefaultDelayCalldata = abi.encodeWithSelector(
      GovernorTimelockControlConfigurable.updateDefaultDelay.selector, newDefaultDelay
    );
    uint256 configureDelay =
      _proposeAndExecute(configureDefaultDelayCalldata, TIMELOCK_DELAY_HIGH, address(governor));

    bytes memory callD = abi.encodeWithSelector(DummyDaoTargetTester.normalFunction.selector, 10);

    uint256 delay = _proposeAndExecute(callD, newDefaultDelay, address(target));

    uint256 dataAfter = target._normalData();

    assertEq(configureDelay, TIMELOCK_DELAY_HIGH); // all update*Delay functions are configured with HIGH delays by default
    assertEq(delay, newDefaultDelay);
    assertEq(dataBefore, 0);
    assertEq(dataAfter, 10);
  }

  function testQueueNotConfiguredDefaultDelayViaMessageRelayer() public {
    bytes memory targetCallData =
      abi.encodeWithSelector(DummyDaoTargetTester.unknownFunction.selector, 10);
    bytes memory proposalCalldata = abi.encodeWithSignature(
      "sendMessage(string,string,bytes)", "destinationChain", "destinationAddress", targetCallData
    );

    address[] memory targets = new address[](1);
    targets[0] = address(MESSAGE_RELAYER);

    uint256[] memory values = new uint256[](1);
    values[0] = 0;
    bytes[] memory calldatas = new bytes[](1);
    calldatas[0] = proposalCalldata;

    uint256 proposalId = governor.propose(targets, values, calldatas, "");

    _waitBlocks(VOTING_DELAY + 1);

    vm.prank(VOTER);
    governor.castVote(proposalId, uint8(GovernorCountingSimple.VoteType.For));

    _waitBlocks(VOTING_PERIOD);

    governor.queue(targets, values, calldatas, keccak256(bytes("")));
    uint256 queuedTimestamp = block.timestamp;
    uint256 proposalEta = governor.proposalEta(proposalId);
    uint256 delay = proposalEta - queuedTimestamp;

    assertEq(delay, TIMELOCK_DELAY_DEFAULT);
  }

  function testQueueDefaultDelayNotConfigured() public {
    uint256 dataBefore = target._unknownData();

    bytes memory callD = abi.encodeWithSelector(DummyDaoTargetTester.unknownFunction.selector, 10);
    uint256 delay = _proposeAndExecute(callD, TIMELOCK_DELAY_DEFAULT, address(target));

    uint256 dataAfter = target._unknownData();

    assertEq(delay, TIMELOCK_DELAY_DEFAULT);
    assertEq(dataBefore, 0);
    assertEq(dataAfter, 10);
  }

  function testQueueDefaultDelayNotConfiguredConfiguredAsDefault() public {
    uint256 dataBefore = target._unknownData();

    bytes4[] memory configuredSelectors = new bytes4[](1);
    configuredSelectors[0] = DummyDaoTargetTester.unknownFunction.selector;

    bytes memory configureCallData = abi.encodeWithSelector(
      GovernorTimelockControlConfigurable.addDelayConfiguration.selector,
      new bytes4[](0),
      new bytes4[](0),
      configuredSelectors
    );
    uint256 configureDelay =
      _proposeAndExecute(configureCallData, TIMELOCK_DELAY_HIGH, address(governor));

    bytes memory callD = abi.encodeWithSelector(DummyDaoTargetTester.unknownFunction.selector, 10);
    uint256 delay = _proposeAndExecute(callD, TIMELOCK_DELAY_DEFAULT, address(target));

    uint256 dataAfter = target._unknownData();

    assertEq(configureDelay, TIMELOCK_DELAY_HIGH);
    assertEq(delay, TIMELOCK_DELAY_DEFAULT);
    assertEq(dataBefore, 0);
    assertEq(dataAfter, 10);
  }

  function testQueueDefaultAfterModificationDelayNotConfigured() public {
    uint256 newDefaultDelay = 6000;
    uint256 dataBefore = target._unknownData();

    bytes memory configureDefaultDelayCalldata = abi.encodeWithSelector(
      GovernorTimelockControlConfigurable.updateDefaultDelay.selector, newDefaultDelay
    );
    uint256 configureDelay =
      _proposeAndExecute(configureDefaultDelayCalldata, TIMELOCK_DELAY_HIGH, address(governor));

    bytes memory callD = abi.encodeWithSelector(DummyDaoTargetTester.unknownFunction.selector, 10);

    uint256 delay = _proposeAndExecute(callD, newDefaultDelay, address(target));

    uint256 dataAfter = target._unknownData();

    assertEq(configureDelay, TIMELOCK_DELAY_HIGH); // all update*Delay functions are configured with HIGH delays by default
    assertEq(delay, newDefaultDelay);
    assertEq(dataBefore, 0);
    assertEq(dataAfter, 10);
  }

  function _deployGovernor(
    uint256 _timelockDelayDefault,
    uint256 _timelockDelayLow,
    uint256 _timelockDelayHigh,
    uint256 _votingDelay,
    uint256 _votingPeriod,
    uint256 _proposalThreshold,
    uint256 _quorumNumerator
  ) private {
    initiationData = new GovernanceInitiationData();
    CoraToken.Recipient memory recipient = CoraToken.Recipient(address(this), TOKEN_SUPPLY);
    CoraToken.Recipient[] memory recipients = new CoraToken.Recipient[](1);
    recipients[0] = recipient;
    token = new CoraToken(initiationData, recipients);

    initiationData.populate(
      GovernanceInitiationData.SetupData(address(0), address(0), address(this))
    );

    timelock = new CoraTimelockController(
            0,
            new address[](0),
            new address[](0),
            initiationData
        );

    target = new DummyDaoTargetTester();

    configuredSignatures.push(target.normalFunction.selector);
    configuredSignatures.push(target.lowFunction.selector);
    configuredSignatures.push(target.highFunction.selector);

    configuredDelays.push(GovernorTimelockControlConfigurable.DelayType.DEFAULT);
    configuredDelays.push(GovernorTimelockControlConfigurable.DelayType.SHORT);
    configuredDelays.push(GovernorTimelockControlConfigurable.DelayType.LONG);

    governor = new CoraGovernor(
            CoraGovernor.CoraGovernorParams(
                token,
                timelock,
                MESSAGE_RELAYER,
                configuredSignatures,
                configuredDelays,
                _timelockDelayLow,
                _timelockDelayDefault,
                _timelockDelayHigh,
                _votingDelay,
                _votingPeriod,
                _proposalThreshold,
                _quorumNumerator
            )
        );
    // @dev Prank because only the timelock can configure itself
    vm.startPrank(address(timelock));
    timelock.grantRole(keccak256("PROPOSER_ROLE"), address(governor));
    timelock.grantRole(keccak256("EXECUTOR_ROLE"), address(governor));
    vm.stopPrank();

    token.transfer(VOTER, VOTER_INITIAL_BALANCE);
    token.transfer(VOTER_2, VOTER_2_INITIAL_BALANCE);

    vm.prank(VOTER);
    token.delegate(VOTER);
    vm.prank(VOTER_2);
    token.delegate(VOTER_2);

    _waitBlocks(1);
  }

  function _proposeAndExecute(bytes memory _calldata, uint256 _timelockWaitFor, address _target)
    private
    returns (uint256)
  {
    address[] memory targets = new address[](1);
    targets[0] = address(_target);

    uint256[] memory values = new uint256[](1);
    values[0] = 0;
    bytes[] memory calldatas = new bytes[](1);
    calldatas[0] = _calldata;

    uint256 proposalId = governor.propose(targets, values, calldatas, "");

    _waitBlocks(VOTING_DELAY + 1);

    vm.prank(VOTER);
    governor.castVote(proposalId, uint8(GovernorCountingSimple.VoteType.For));

    _waitBlocks(VOTING_PERIOD);

    governor.queue(targets, values, calldatas, keccak256(bytes("")));
    uint256 queuedTimestamp = block.timestamp;
    uint256 proposalEta = governor.proposalEta(proposalId);
    uint256 delay = proposalEta - queuedTimestamp;

    _increaseTimeBy(_timelockWaitFor);

    governor.execute(targets, values, calldatas, keccak256(bytes("")));

    return delay;
  }
}
