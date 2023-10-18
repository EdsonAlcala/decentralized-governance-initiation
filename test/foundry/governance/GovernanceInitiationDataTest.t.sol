//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import { BaseTest } from "../BaseTest.sol";
import { GovernanceInitiationData } from "contracts/governance/GovernanceInitiationData.sol";
import "contracts/governance/GovernanceErrors.sol";

contract GovernanceInitiationDataTest is BaseTest {
  GovernanceInitiationData data;

  function setUp() public {
    data = new GovernanceInitiationData();
  }

  function testCannotPopulateTwice() public {
    data.populate(GovernanceInitiationData.SetupData(address(1), address(2), address(3)));

    vm.expectRevert(GovernanceInitializationAlreadyPopulated.selector);

    data.populate(GovernanceInitiationData.SetupData(address(0), address(0), address(0)));

    assertEq(data.tokenAddress(), address(1));
    assertEq(data.timelockAddress(), address(2));
    assertEq(data.governorAddress(), address(3));
  }

  function testCanOnlyPopulateInTheSameBlock() public {
    vm.expectRevert(GovernanceInitializationBadBlockNumber.selector);
    _waitBlocks(1);
    data.populate(GovernanceInitiationData.SetupData(address(1), address(2), address(3)));
  }
}
