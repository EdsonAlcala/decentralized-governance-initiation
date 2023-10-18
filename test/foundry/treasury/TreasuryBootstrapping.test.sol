//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import "forge-std/console.sol";

import "contracts/treasury/TreasuryBootstrapping.sol";
import { CoraToken } from "contracts/governance/CoraToken.sol";
import { GovernanceInitiationData } from "contracts/governance/GovernanceInitiationData.sol";

import { FakeLUSD } from "./mocks/FakeLUSD.sol";

import { BaseTest } from "../BaseTest.sol";
import { ModifiedMerkleTree } from "../ModifiedMerkleTree.sol";

contract TreasuryBootstrappingTest is BaseTest {
  GovernanceInitiationData initiationData;
  TreasuryBootstrapping treasuryBootstrapping;
  FakeLUSD fakeLUSD;
  CoraToken coraToken;

  uint256 internal constant LUSD_DECIMALS = 18;
  uint256 internal constant CORA_DECIMALS = 18;

  uint256 internal constant LUSD_FACTOR = 10 ** LUSD_DECIMALS;
  uint256 internal constant CORA_FACTOR = 10 ** CORA_DECIMALS;

  uint256 internal constant FDV = 15_000_000 * LUSD_DECIMALS;
  uint256 internal constant TARGET_AMOUNT = 1_500_000 * LUSD_FACTOR;
  uint256 internal constant AMOUNT_CORA = 10_000_000 * CORA_FACTOR;
  uint256 internal constant TOTAL_SUPPLY_CORA = 100_000_000 * CORA_FACTOR;

  uint256 internal constant DURATION = 10 days;
  uint256 internal constant PRIVATE_PERIOD = 6 days;
  uint256 internal constant MIN_CONTRIBUTION_SIZE = 1_500 * LUSD_FACTOR;
  uint256 internal constant MAX_CONTRIBUTION_SIZE = 30_000 * LUSD_FACTOR;
  uint256 internal constant START_TIME_AFTER_APPROVAL = 3 days;

  address internal immutable BENEFICIARY = makeAddr("beneficiary");
  address internal immutable ISSUER = makeAddr("issuer");
  address internal immutable DAO = makeAddr("DAO");
  address internal immutable RECIPIENT = makeAddr("DAO");

  bytes32 internal constant ZERO_BYTES = bytes32(0);

  address[] public ALL_ADDRESSES = [
    0x72e37d393c70823113a7176aC1F7C579d2C5623E,
    0xF49b089183Ec02baD392630a82C0f5B5C3BfAbe9,
    0xa670a43859bBa57dA9F0A275B601A3F0AcccD41a,
    0xd6BD0AA9EC3b00a11c9b56263Ba730d3c1A82b18
  ];

  function setUp() public {
    _setUp();
  }

  function _setUp() internal {
    vm.startPrank(ISSUER);

    initiationData = new GovernanceInitiationData();

    // @dev We compute the address for the cora token
    uint256 deployerNonce = vm.getNonce(ISSUER);
    address tokenExpectedAddress = computeCreateAddress(ISSUER, deployerNonce);

    address treasuryExpectedAddress = computeCreateAddress(ISSUER, deployerNonce + 1);

    // @dev Setup initiation contract
    initiationData.populate(
      GovernanceInitiationData.SetupData({
        tokenAddress: tokenExpectedAddress,
        timelockAddress: DAO, // @dev We say the DAO is the timelock controller
        governorAddress: address(0) // @dev No governor
       })
    );

    // Transfer CORA to the DAO and the treasuryBootstrapping contract
    CoraToken.Recipient[] memory recipients = new CoraToken.Recipient[](2);
    recipients[0] = CoraToken.Recipient(DAO, TOTAL_SUPPLY_CORA - AMOUNT_CORA);

    recipients[1] = CoraToken.Recipient(treasuryExpectedAddress, AMOUNT_CORA);

    coraToken = new CoraToken(initiationData, recipients);

    treasuryBootstrapping = new TreasuryBootstrapping(initiationData);

    fakeLUSD = new FakeLUSD(TARGET_AMOUNT);

    vm.stopPrank();
  }

  function testPropertiesBeforeApprove() public view {
    assert(treasuryBootstrapping.initiationData() == initiationData);
    assert(treasuryBootstrapping.coraToken() == coraToken);
    assert(address(treasuryBootstrapping.stablecoinToken()) == address(0));

    assert(treasuryBootstrapping.SUPPLY_FOR_BOOTSTRAPPING() == 10_000_000 ether);
    assert(treasuryBootstrapping.SUPPLY_PERCENTAGE() == 0.1 ether);

    assert(treasuryBootstrapping.startTimeStamp() == 0);
    assert(treasuryBootstrapping.amountPerUnit() == 0);
    assert(treasuryBootstrapping.totalContributions() == 0);
    assert(treasuryBootstrapping.getStatus() == TreasuryBootstrapping.State.Deployed);

    assert(treasuryBootstrapping.fdv() == 0);
    assert(treasuryBootstrapping.targetAmount() == 0);
    assert(treasuryBootstrapping.duration() == 0);
    assert(treasuryBootstrapping.privatePeriod() == 0);
    assert(treasuryBootstrapping.beneficiary() == address(0));
    assert(treasuryBootstrapping.minContributionSize() == 0);
    assert(treasuryBootstrapping.maxContributionSize() == 0);
    assert(treasuryBootstrapping.merkleRoot() == bytes32(0));
  }

  function testPropertiesAfterApproved() public {
    // Prepare the merkle tree
    ModifiedMerkleTree m = new ModifiedMerkleTree();

    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 merkleRoot = m.getRoot(data);

    _approveAndSchedule(merkleRoot);

    assert(treasuryBootstrapping.initiationData() == initiationData);
    assert(treasuryBootstrapping.coraToken() == coraToken);
    assert(treasuryBootstrapping.stablecoinToken() == fakeLUSD);

    assert(treasuryBootstrapping.SUPPLY_FOR_BOOTSTRAPPING() == 10_000_000 ether);
    assert(treasuryBootstrapping.SUPPLY_PERCENTAGE() == 0.1 ether);

    assert(treasuryBootstrapping.startTimeStamp() == block.timestamp + START_TIME_AFTER_APPROVAL);
    assert(treasuryBootstrapping.amountPerUnit() == 0.15 ether); // 0.15 in LUSD
    assert(treasuryBootstrapping.totalContributions() == 0);
    assert(treasuryBootstrapping.getStatus() == TreasuryBootstrapping.State.Approved);

    assert(treasuryBootstrapping.fdv() == FDV);
    assert(treasuryBootstrapping.targetAmount() == TARGET_AMOUNT);
    assert(treasuryBootstrapping.duration() == DURATION);
    assert(treasuryBootstrapping.privatePeriod() == PRIVATE_PERIOD);
    assert(treasuryBootstrapping.beneficiary() == BENEFICIARY);
    assert(treasuryBootstrapping.minContributionSize() == 1_500 ether); // 1.5k in LUSD
    assert(treasuryBootstrapping.maxContributionSize() == 30_000 ether); // 30k in LUSD

    assert(treasuryBootstrapping.merkleRoot() == merkleRoot);
  }

  function testOnlyDAOCanApproveAndSchedule() public {
    // Prepare the merkle tree
    ModifiedMerkleTree m = new ModifiedMerkleTree();

    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 merkleRoot = m.getRoot(data);

    vm.prank(BENEFICIARY);

    vm.expectRevert(OnlyDAO.selector);
    treasuryBootstrapping.approveAndSchedule(
      FDV,
      TARGET_AMOUNT,
      DURATION,
      PRIVATE_PERIOD,
      BENEFICIARY,
      MIN_CONTRIBUTION_SIZE,
      MAX_CONTRIBUTION_SIZE,
      START_TIME_AFTER_APPROVAL,
      address(fakeLUSD),
      merkleRoot
    );
  }

  function testBootstrap_whenNotApprovedYet_reverts() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();

    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 merkleRoot = m.getRoot(data);

    // Send all the fakeLUSD to the recipient
    vm.prank(ISSUER);
    fakeLUSD.transfer(0x72e37d393c70823113a7176aC1F7C579d2C5623E, TARGET_AMOUNT);

    // Claim as 0x72e37d393c70823113a7176aC1F7C579d2C5623E => node1
    vm.startPrank(0x72e37d393c70823113a7176aC1F7C579d2C5623E);

    // Approve LUSD to treasuryBootstrapping
    fakeLUSD.approve(address(treasuryBootstrapping), TARGET_AMOUNT);

    // Claim as 0x72e37d393c70823113a7176aC1F7C579d2C5623E => node1
    uint256 node1Index = 0;
    uint256 orderedIndexToGetProof = 3;

    // Get proof
    bytes32[] memory proof0 = m.getProof(data, orderedIndexToGetProof); // will get proof for node1
    bool verified0 = m.verifyProof(merkleRoot, proof0, data[orderedIndexToGetProof]);
    assert(verified0 == true);

    vm.expectRevert(NotApprovedYet.selector);
    treasuryBootstrapping.bootstrap(TARGET_AMOUNT, node1Index, proof0);

    vm.stopPrank();
  }

  function testBootstrap_whenApprovedButStartTimeInThePast_reverts() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();

    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 merkleRoot = m.getRoot(data);

    _approveAndSchedule(merkleRoot);

    // Send all the fakeLUSD to the recipient
    vm.prank(ISSUER);
    fakeLUSD.transfer(0x72e37d393c70823113a7176aC1F7C579d2C5623E, TARGET_AMOUNT);

    // Claim as 0x72e37d393c70823113a7176aC1F7C579d2C5623E => node1
    vm.startPrank(0x72e37d393c70823113a7176aC1F7C579d2C5623E);

    // Approve LUSD to treasuryBootstrapping
    fakeLUSD.approve(address(treasuryBootstrapping), TARGET_AMOUNT);

    uint256 node1Index = 0;
    uint256 orderedIndexToGetProof = 3;

    // Get proof
    bytes32[] memory proof0 = m.getProof(data, orderedIndexToGetProof); // will get proof for node1
    bool verified0 = m.verifyProof(merkleRoot, proof0, data[orderedIndexToGetProof]);
    assert(verified0 == true);

    vm.expectRevert(NotStartedYet.selector);
    treasuryBootstrapping.bootstrap(MAX_CONTRIBUTION_SIZE, node1Index, proof0);

    vm.stopPrank();
  }

  function testOnlyValidAmounts_revert() public {
    // Prepare the merkle tree
    ModifiedMerkleTree m = new ModifiedMerkleTree();

    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 merkleRoot = m.getRoot(data);

    _approveAndSchedule(merkleRoot);

    // Send all the fakeLUSD to the recipient
    vm.prank(ISSUER);
    fakeLUSD.transfer(0x72e37d393c70823113a7176aC1F7C579d2C5623E, TARGET_AMOUNT);

    // Claim as 0x72e37d393c70823113a7176aC1F7C579d2C5623E => node1
    vm.startPrank(0x72e37d393c70823113a7176aC1F7C579d2C5623E);

    // Approve LUSD to treasuryBootstrapping
    fakeLUSD.approve(address(treasuryBootstrapping), TARGET_AMOUNT);

    uint256 node1Index = 0;
    uint256 orderedIndexToGetProof = 3;

    // Get proof
    bytes32[] memory proof0 = m.getProof(data, orderedIndexToGetProof); // will get proof for node1
    bool verified0 = m.verifyProof(merkleRoot, proof0, data[orderedIndexToGetProof]);
    assert(verified0 == true);

    _increaseTimeBy(block.timestamp + START_TIME_AFTER_APPROVAL + 1);

    vm.expectRevert(InvalidContributionAmount.selector);
    treasuryBootstrapping.bootstrap(TARGET_AMOUNT - 1, node1Index, proof0);

    vm.stopPrank();
  }

  function testBootstrap_whenAmountReachLimits_reverts() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();

    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 merkleRoot = m.getRoot(data);

    _approveAndSchedule(merkleRoot);

    // Send all the fakeLUSD to the recipient
    vm.prank(ISSUER);
    fakeLUSD.transfer(0x72e37d393c70823113a7176aC1F7C579d2C5623E, TARGET_AMOUNT);

    // Claim as 0x72e37d393c70823113a7176aC1F7C579d2C5623E => node1
    vm.startPrank(0x72e37d393c70823113a7176aC1F7C579d2C5623E);

    // Approve LUSD to treasuryBootstrapping
    fakeLUSD.approve(address(treasuryBootstrapping), TARGET_AMOUNT);

    uint256 node1Index = 0;
    uint256 orderedIndexToGetProof = 3;

    // Get proof
    bytes32[] memory proof0 = m.getProof(data, orderedIndexToGetProof); // will get proof for node1
    bool verified0 = m.verifyProof(merkleRoot, proof0, data[orderedIndexToGetProof]);
    assert(verified0 == true);

    _increaseTimeBy(block.timestamp + START_TIME_AFTER_APPROVAL + 1);
    vm.expectRevert(ContributionSizeReached.selector);
    treasuryBootstrapping.bootstrap(TARGET_AMOUNT, node1Index, proof0);

    vm.stopPrank();
  }

  function testBootstrap() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();

    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 merkleRoot = m.getRoot(data);

    _approveAndSchedule(merkleRoot);

    // Send all the fakeLUSD to the recipient
    vm.prank(ISSUER);
    fakeLUSD.transfer(0x72e37d393c70823113a7176aC1F7C579d2C5623E, TARGET_AMOUNT);

    // Claim as 0x72e37d393c70823113a7176aC1F7C579d2C5623E => node1
    vm.startPrank(0x72e37d393c70823113a7176aC1F7C579d2C5623E);

    // Approve LUSD to treasuryBootstrapping
    fakeLUSD.approve(address(treasuryBootstrapping), TARGET_AMOUNT);

    uint256 node1Index = 0;
    uint256 orderedIndexToGetProof = 3;

    // Get proof
    bytes32[] memory proof0 = m.getProof(data, orderedIndexToGetProof); // will get proof for node1
    bool verified0 = m.verifyProof(merkleRoot, proof0, data[orderedIndexToGetProof]);
    assert(verified0 == true);

    _increaseTimeBy(block.timestamp + START_TIME_AFTER_APPROVAL + 1);

    treasuryBootstrapping.bootstrap(MAX_CONTRIBUTION_SIZE, node1Index, proof0);

    vm.stopPrank();
    uint256 amountOfCoraAdquired = 200_000 ether;
    assertEq(fakeLUSD.balanceOf(address(treasuryBootstrapping)), MAX_CONTRIBUTION_SIZE);
    assertEq(
      fakeLUSD.balanceOf(0x72e37d393c70823113a7176aC1F7C579d2C5623E),
      TARGET_AMOUNT - MAX_CONTRIBUTION_SIZE
    );
    assertEq(treasuryBootstrapping.totalContributions(), MAX_CONTRIBUTION_SIZE);
    assertEq(
      treasuryBootstrapping.contributionsPerAddress(0x72e37d393c70823113a7176aC1F7C579d2C5623E),
      MAX_CONTRIBUTION_SIZE
    );
    // new balance of the treasuryBootstrapping
    assertEq(
      coraToken.balanceOf(address(treasuryBootstrapping)), AMOUNT_CORA - amountOfCoraAdquired
    );
    // new balance of the contributor
    assertEq(coraToken.balanceOf(0x72e37d393c70823113a7176aC1F7C579d2C5623E), amountOfCoraAdquired);
  }

  // cancel
  function testCancelByAnotherParty_reverts() public {
    vm.prank(ISSUER);
    vm.expectRevert(OnlyDAO.selector);
    treasuryBootstrapping.cancel();
  }

  function testCancelByTheDAO() public {
    vm.prank(DAO);
    treasuryBootstrapping.cancel();

    assertEq(
      uint256(treasuryBootstrapping.getStatus()), uint256(TreasuryBootstrapping.State.Cancelled)
    );
  }

  function testCancelWhenApproved_reverts() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();

    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 merkleRoot = m.getRoot(data);

    _approveAndSchedule(merkleRoot);

    vm.prank(DAO);
    vm.expectRevert(InvalidDeployedState.selector);
    treasuryBootstrapping.cancel();
  }

  // private period
  function testBootstrapDuringPrivatePeriodIfNotWhitelisted_reverts() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();

    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 merkleRoot = m.getRoot(data);

    _approveAndSchedule(merkleRoot);

    // Send all the fakeLUSD to the recipient
    vm.prank(ISSUER);
    fakeLUSD.transfer(0x72e37d393c70823113a7176aC1F7C579d2C5623E, TARGET_AMOUNT);

    // Claim as 0x72e37d393c70823113a7176aC1F7C579d2C5623E => node1
    vm.startPrank(0x72e37d393c70823113a7176aC1F7C579d2C5623E);

    // Approve LUSD to treasuryBootstrapping
    fakeLUSD.approve(address(treasuryBootstrapping), TARGET_AMOUNT);

    _increaseTimeBy(block.timestamp + START_TIME_AFTER_APPROVAL + 1);

    vm.expectRevert(InvalidProof.selector);
    treasuryBootstrapping.bootstrap(MAX_CONTRIBUTION_SIZE, 0, new bytes32[](0));
  }

  function testBootstrapAfterPrivatePeriodIfNotWhitelisted() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();

    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 merkleRoot = m.getRoot(data);

    _approveAndSchedule(merkleRoot);

    // Send all the fakeLUSD to the recipient
    vm.startPrank(ISSUER);

    // Approve LUSD to treasuryBootstrapping
    fakeLUSD.approve(address(treasuryBootstrapping), TARGET_AMOUNT);

    _increaseTimeBy(block.timestamp + START_TIME_AFTER_APPROVAL + PRIVATE_PERIOD + 1);

    treasuryBootstrapping.bootstrap(MAX_CONTRIBUTION_SIZE, 0, new bytes32[](0));

    uint256 amountOfCoraAdquired = treasuryBootstrapping.calculateAmount(MAX_CONTRIBUTION_SIZE);
    assertEq(fakeLUSD.balanceOf(address(treasuryBootstrapping)), MAX_CONTRIBUTION_SIZE);
    assertEq(
      fakeLUSD.balanceOf(address(treasuryBootstrapping)), treasuryBootstrapping.getStablesBalance()
    );
    assertEq(fakeLUSD.balanceOf(ISSUER), TARGET_AMOUNT - MAX_CONTRIBUTION_SIZE);
    assertEq(treasuryBootstrapping.totalContributions(), MAX_CONTRIBUTION_SIZE);
    assertEq(treasuryBootstrapping.contributionsPerAddress(ISSUER), MAX_CONTRIBUTION_SIZE);
    // new balance of the treasuryBootstrapping
    assertEq(
      coraToken.balanceOf(address(treasuryBootstrapping)), AMOUNT_CORA - amountOfCoraAdquired
    );
    assertEq(
      coraToken.balanceOf(address(treasuryBootstrapping)),
      treasuryBootstrapping.getRemainingTokens()
    );
    // new balance of the contributor
    assertEq(coraToken.balanceOf(ISSUER), amountOfCoraAdquired);

    vm.stopPrank();
  }

  // calculate amount
  function testCalculateAmountWhenAmountPerUnitNotSet_reverts() public {
    vm.expectRevert(AmountPerUnitNotSet.selector);
    treasuryBootstrapping.calculateAmount(MAX_CONTRIBUTION_SIZE);
  }

  function testCalculateAmountWhenStableAmountIsZero_reverts() public {
    vm.expectRevert(InvalidAmount.selector);
    treasuryBootstrapping.calculateAmount(0);
  }

  // get end date
  function testGetEndDate() public {
    uint256 currentTime = block.timestamp;
    testBootstrap();

    assertEq(treasuryBootstrapping.getEndDate(), currentTime + START_TIME_AFTER_APPROVAL + DURATION);
  }

  function testGetEndOfPrivatePeriod() public {
    uint256 currentTime = block.timestamp;
    testBootstrap();

    assertEq(
      treasuryBootstrapping.getEndOfPrivatePeriod(),
      currentTime + START_TIME_AFTER_APPROVAL + PRIVATE_PERIOD
    );
  }

  // get status
  function testGetStatus() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();

    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 merkleRoot = m.getRoot(data);

    _approveAndSchedule(merkleRoot);

    assertEq(
      uint256(treasuryBootstrapping.getStatus()), uint256(TreasuryBootstrapping.State.Approved)
    );

    _increaseTimeBy(block.timestamp + START_TIME_AFTER_APPROVAL + 1);

    assertEq(
      uint256(treasuryBootstrapping.getStatus()), uint256(TreasuryBootstrapping.State.Started)
    );
  }

  // settle
  function testSettle() public {
    testBootstrap();

    _increaseTimeBy(block.timestamp + DURATION + 1);

    treasuryBootstrapping.settle();

    assertEq(
      uint256(treasuryBootstrapping.getStatus()), uint256(TreasuryBootstrapping.State.Settled)
    );

    assertEq(coraToken.balanceOf(address(treasuryBootstrapping)), 0);
    assertEq(
      coraToken.balanceOf(0x72e37d393c70823113a7176aC1F7C579d2C5623E),
      treasuryBootstrapping.calculateAmount(MAX_CONTRIBUTION_SIZE)
    );
  }

  function testSettleWhenHasntFinished() public {
    testBootstrap();

    vm.expectRevert(NotFinishedYet.selector);
    treasuryBootstrapping.settle();
  }

  function testSettleByAnybody() public {
    testBootstrap();

    _increaseTimeBy(block.timestamp + DURATION + 1);

    vm.prank(ISSUER);
    treasuryBootstrapping.settle();
  }

  function _approveAndSchedule(bytes32 _merkleRoot) internal {
    vm.prank(DAO);

    treasuryBootstrapping.approveAndSchedule(
      FDV,
      TARGET_AMOUNT,
      DURATION,
      PRIVATE_PERIOD,
      BENEFICIARY,
      MIN_CONTRIBUTION_SIZE,
      MAX_CONTRIBUTION_SIZE,
      START_TIME_AFTER_APPROVAL,
      address(fakeLUSD),
      _merkleRoot
    );
  }

  // Internal functions
  function _toNode(uint256 index, address account) internal pure returns (bytes32) {
    bytes memory encoded = abi.encodePacked(index, account);
    bytes32 hash = keccak256(encoded);
    return hash;
  }

  function _getDefaultData() internal view returns (bytes32[] memory) {
    bytes32 node1 = _toNode(0, ALL_ADDRESSES[0]);
    bytes32 node2 = _toNode(1, ALL_ADDRESSES[1]);
    bytes32 node3 = _toNode(2, ALL_ADDRESSES[2]);
    bytes32 node4 = _toNode(3, ALL_ADDRESSES[3]);

    bytes32[] memory nonOrderedData = new bytes32[](4);
    nonOrderedData[0] = node1;
    nonOrderedData[1] = node2;
    nonOrderedData[2] = node3;
    nonOrderedData[3] = node4;

    bytes32[] memory orderedData = _orderBytes32(nonOrderedData);

    return orderedData;
  }

  function _orderBytes32(bytes32[] memory values) public pure returns (bytes32[] memory) {
    for (uint256 i = 0; i < values.length - 1; i++) {
      for (uint256 j = i + 1; j < values.length; j++) {
        if (values[i] > values[j]) {
          (values[i], values[j]) = (values[j], values[i]);
        }
      }
    }
    return values;
  }
}
