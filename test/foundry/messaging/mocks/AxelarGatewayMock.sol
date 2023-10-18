//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import { IAxelarGateway } from "@axelarnetwork/contracts/interfaces/IAxelarGateway.sol";

contract AxelarGatewayMock is IAxelarGateway {
  address[] _admins;
  CallContract public lastCallContract;

  struct CallContract {
    string destinationChain;
    string contractAddress;
    bytes payload;
  }

  function sendToken(
    string calldata destinationChain,
    string calldata destinationAddress,
    string calldata symbol,
    uint256 amount
  ) external { }

  function callContract(
    string calldata destinationChain,
    string calldata contractAddress,
    bytes calldata payload
  ) external {
    lastCallContract = CallContract(destinationChain, contractAddress, payload);
  }

  function callContractWithToken(
    string calldata,
    string calldata,
    bytes calldata,
    string calldata,
    uint256
  ) external { }

  function isContractCallApproved(bytes32, string calldata, string calldata, address, bytes32)
    external
    pure
    returns (bool)
  {
    return true;
  }

  function isContractCallAndMintApproved(
    bytes32,
    string calldata,
    string calldata,
    address,
    bytes32,
    string calldata,
    uint256
  ) external pure returns (bool) {
    return true;
  }

  function validateContractCall(bytes32, string calldata, string calldata, bytes32)
    external
    pure
    returns (bool)
  {
    return true;
  }

  function validateContractCallAndMint(
    bytes32,
    string calldata,
    string calldata,
    bytes32,
    string calldata,
    uint256
  ) external pure returns (bool) {
    return true;
  }

  /**
   * \
   *   |* Getters *|
   *   \**********
   */
  function governance() external pure returns (address) {
    return address(0);
  }

  function mintLimiter() external pure returns (address) {
    return address(0);
  }

  function transferGovernance(address newGovernance) external {
    _admins.push(newGovernance);
  }

  function transferMintLimiter(address newGovernance) external {
    _admins.push(newGovernance);
  }

  function authModule() external pure returns (address) {
    return address(0);
  }

  function tokenDeployer() external pure returns (address) {
    return address(0);
  }

  function tokenMintLimit(string memory) external pure returns (uint256) {
    return 0;
  }

  function tokenMintAmount(string memory) external pure returns (uint256) {
    return 0;
  }

  function allTokensFrozen() external pure returns (bool) {
    return false;
  }

  function implementation() external pure returns (address) {
    return address(0);
  }

  function tokenAddresses(string memory) external pure returns (address) {
    return address(0);
  }

  function tokenFrozen(string memory) external pure returns (bool) {
    return false;
  }

  function isCommandExecuted(bytes32) external pure returns (bool) {
    return true;
  }

  function adminEpoch() external pure returns (uint256) {
    return 0;
  }

  function adminThreshold(uint256) external pure returns (uint256) {
    return 0;
  }

  function admins(uint256) external view returns (address[] memory) {
    return _admins;
  }

  /**
   * \
   *   |* Admin Functions *|
   *   \******************
   */

  function setTokenMintLimits(string[] calldata symbols, uint256[] calldata limits) external { }

  function upgrade(
    address newImplementation,
    bytes32 newImplementationCodeHash,
    bytes calldata setupParams
  ) external { }

  /**
   * \
   *   |* External Functions *|
   *   \*********************
   */

  function setup(bytes calldata params) external { }

  function execute(bytes calldata input) external { }
}
