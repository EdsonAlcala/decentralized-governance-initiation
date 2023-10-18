//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import { IDeployer } from "../interfaces/IDeployer.sol";
import { GovernanceInitiationData } from "./GovernanceInitiationData.sol";

/**
 * @title GovernanceInitiationData
 * @author Cora Dev Team
 * @notice This contract is used to deploy and populate the GovernanceInitiationData contract.
 */
contract GovernanceInitiationDataDeployer {
  IDeployer public immutable deployer;

  constructor(
    bytes memory _initCode,
    bytes32 _salt,
    GovernanceInitiationData.SetupData memory _data
  ) {
    deployer = IDeployer(0xce0042B868300000d44A59004Da54A005ffdcf9f);
    address createdContract = deployer.deploy(_initCode, _salt);
    GovernanceInitiationData initiationData = GovernanceInitiationData(createdContract);
    initiationData.populate(_data);
    emit Deployed(msg.sender, address(initiationData));
  }

  event Deployed(address indexed sender, address indexed addr);
}
