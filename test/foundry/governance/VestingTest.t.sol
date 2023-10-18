//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import { BaseTest } from "../BaseTest.sol";
import { GovernanceInitiationData } from "contracts/governance/GovernanceInitiationData.sol";
import { CoraToken } from "contracts/governance/CoraToken.sol";
import { Vesting } from "contracts/governance/Vesting.sol";

contract VestingTest is BaseTest {
  uint256 constant VESTING_AMOUNT = 100_000_000 ether;
  uint256 constant VESTING_PER_MONTH = VESTING_AMOUNT / 4;
  uint256 constant MONTH = 30 days;
  address immutable BENEFICIARY_ADDRESS = makeAddr("beneficiaryAddress");

  GovernanceInitiationData initiationData;
  CoraToken token;
  Vesting vesting;

  uint256 vestingStartTimestamp;

  function setUp() public {
    uint256 deployerNonce = vm.getNonce(address(this));
    address vestingExpectedAddress = computeCreateAddress(address(this), deployerNonce + 2);

    initiationData = new GovernanceInitiationData();
    CoraToken.Recipient memory recipient =
      CoraToken.Recipient(vestingExpectedAddress, VESTING_AMOUNT);
    CoraToken.Recipient[] memory recipients = new CoraToken.Recipient[](1);
    recipients[0] = recipient;
    token = new CoraToken(initiationData, recipients);

    initiationData.populate(
      GovernanceInitiationData.SetupData(address(token), address(0), address(0))
    );

    vesting = new Vesting(initiationData, BENEFICIARY_ADDRESS, 0, 1, 4);
    vestingStartTimestamp = block.timestamp;
  }

  function testDeployment() public {
    assertEq(vesting.beneficiary(), BENEFICIARY_ADDRESS);
    assertEq(address(vesting.token()), address(token));
    assertEq(vesting.cliffInMonths(), 1);
    assertEq(vesting.startTimestamp(), vestingStartTimestamp);
    assertEq(vesting.durationInMonths(), 4);
    assertEq(vesting.released(), 0);
    assertEq(vesting.vestedAmount(), 0);
    assertEq(token.balanceOf(address(vesting)), VESTING_AMOUNT);
    assertEq(token.balanceOf(BENEFICIARY_ADDRESS), 0);
  }

  function testCannotVestBeforeCliff() public {
    vm.expectRevert("No tokens to release");
    vesting.release();
  }

  function testCanVestMonthly() public {
    _increaseTimeBy(MONTH);
    vesting.release();
    uint256 beneficiaryBalanceMonth1 = token.balanceOf(BENEFICIARY_ADDRESS);
    uint256 vestingBalanceMonth1 = token.balanceOf(address(vesting));

    _increaseTimeBy(MONTH);
    vesting.release();
    uint256 beneficiaryBalanceMonth2 = token.balanceOf(BENEFICIARY_ADDRESS);
    uint256 vestingBalanceMonth2 = token.balanceOf(address(vesting));

    _increaseTimeBy(MONTH);
    vesting.release();
    uint256 beneficiaryBalanceMonth3 = token.balanceOf(BENEFICIARY_ADDRESS);
    uint256 vestingBalanceMonth3 = token.balanceOf(address(vesting));

    _increaseTimeBy(MONTH);
    vesting.release();
    uint256 beneficiaryBalanceMonth4 = token.balanceOf(BENEFICIARY_ADDRESS);
    uint256 vestingBalanceMonth4 = token.balanceOf(address(vesting));

    _increaseTimeBy(MONTH);
    vm.expectRevert("No tokens to release");
    vesting.release();

    // first month
    assertEq(beneficiaryBalanceMonth1, VESTING_PER_MONTH);
    assertEq(vestingBalanceMonth1, VESTING_AMOUNT - VESTING_PER_MONTH);

    // second month
    assertEq(beneficiaryBalanceMonth2, VESTING_PER_MONTH * 2);
    assertEq(vestingBalanceMonth2, VESTING_AMOUNT - (VESTING_PER_MONTH * 2));

    // third month
    assertEq(beneficiaryBalanceMonth3, VESTING_PER_MONTH * 3);
    assertEq(vestingBalanceMonth3, VESTING_AMOUNT - (VESTING_PER_MONTH * 3));

    // fourth month
    assertEq(beneficiaryBalanceMonth4, VESTING_AMOUNT);
    assertEq(vestingBalanceMonth4, 0);
  }

  function testCanVestMultipleMonthsInOneGo() public {
    _increaseTimeBy(MONTH);
    _increaseTimeBy(MONTH);
    vesting.release();

    assertEq(token.balanceOf(BENEFICIARY_ADDRESS), VESTING_PER_MONTH * 2);
    assertEq(token.balanceOf(address(vesting)), VESTING_AMOUNT - (VESTING_PER_MONTH * 2));
  }

  function testCanVestEverythingInOneGo() public {
    _increaseTimeBy(MONTH);
    _increaseTimeBy(MONTH);
    _increaseTimeBy(MONTH);
    _increaseTimeBy(MONTH);
    _increaseTimeBy(MONTH);
    _increaseTimeBy(MONTH);
    vesting.release();

    assertEq(token.balanceOf(BENEFICIARY_ADDRESS), VESTING_AMOUNT);
    assertEq(token.balanceOf(address(vesting)), 0);
  }
}
