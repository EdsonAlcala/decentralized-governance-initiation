//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import { BaseTest } from "../BaseTest.sol";

import { GovernanceInitiationData } from "contracts/governance/GovernanceInitiationData.sol";
import { CoraToken } from "contracts/governance/CoraToken.sol";
import "contracts/governance/GovernanceErrors.sol";

import { GovernanceInitiationData } from "contracts/governance/GovernanceInitiationData.sol";

contract CoraTokenTest is BaseTest {
  address immutable RECIPIENT = makeAddr("recipient");
  address immutable HOLDER = makeAddr("token holder");
  address immutable DAO = makeAddr("DAO");
  address immutable SOME_GUY = makeAddr("some random geezer");

  uint256 constant SUPPLY = 100_000_000 ether; // 100 Million
  uint256 constant PAUSE_PERIOD = 120 days;

  GovernanceInitiationData initiationData;
  CoraToken token;

  function setUp() public {
    initiationData = new GovernanceInitiationData();

    // we give all the supply to the recipient
    CoraToken.Recipient memory recipient = CoraToken.Recipient(RECIPIENT, SUPPLY);

    CoraToken.Recipient[] memory recipients = new CoraToken.Recipient[](1);
    recipients[0] = recipient;

    token = new CoraToken(initiationData, recipients);

    // @dev Setup initiation contract
    initiationData.populate(
      GovernanceInitiationData.SetupData({
        tokenAddress: address(token),
        timelockAddress: DAO, // @dev We say the DAO is the timelock controller
        governorAddress: address(0) // @dev No governor
       })
    );

    // @dev Transfer tokens to the holder
    vm.prank(RECIPIENT);
    token.transfer(HOLDER, 10 ether);
  }

  function testNotTransferrable_reverts() public {
    vm.expectRevert(ProtocolPaused.selector);

    vm.prank(HOLDER);
    token.transfer(SOME_GUY, 1 ether);

    assertEq(token.balanceOf(SOME_GUY), 0);
  }

  function testNotTransferrableButRecipientIsAllowed() public {
    uint256 recipientBalanceBefore = token.balanceOf(RECIPIENT);

    // @dev Since RECIPIENT can transfer we can try to send tokens to the holder
    vm.prank(RECIPIENT);
    token.transfer(HOLDER, 1 ether);

    uint256 recipientBalanceAfter = token.balanceOf(RECIPIENT);

    assertEq(recipientBalanceAfter, recipientBalanceBefore - 1 ether);
  }

  function testCannotUnpauseBeforePausePeriod_reverts() public {
    // @dev This will revert since the non transferability period hasn't happened
    vm.expectRevert(CoraTokenUnpauseNotReady.selector);

    vm.prank(DAO);
    token.enableTransferability();

    assertEq(token.paused(), true);
  }

  function testCannotUnpauseIfNotDao() public {
    vm.expectRevert(OnlyDAO.selector);

    // @dev If another party tries to enable transferability, it will revert
    vm.prank(SOME_GUY);
    token.enableTransferability();

    assertEq(token.paused(), true);
  }

  function testCannotUnpauseBeforePausePeriod2_reverts() public {
    vm.expectRevert(CoraTokenUnpauseNotReady.selector);

    // @dev Increase time close to the pause period
    _increaseTimeBy(PAUSE_PERIOD - 1);

    // @Dev DAO attemps to enable transferability before should be possible
    vm.prank(DAO);
    token.enableTransferability();

    assertEq(token.paused(), true);
  }

  function testCanUnpauseAfterPausePeriod() public {
    bool pausedBefore = token.paused();

    _increaseTimeBy(PAUSE_PERIOD);

    vm.prank(DAO);
    token.enableTransferability();
    bool pausedAfter = token.paused();

    assertEq(pausedBefore, true);
    assertEq(pausedAfter, false);
  }

  function testTransferrableAfterUnpause() public {
    _increaseTimeBy(PAUSE_PERIOD);

    // @dev Enable transferability
    vm.prank(DAO);
    token.enableTransferability();

    // @dev Attemp to transfer tokens from holder who initially has tokens
    vm.prank(HOLDER);
    token.transfer(SOME_GUY, 1 ether);

    assertEq(token.balanceOf(SOME_GUY), 1 ether);
  }
}
