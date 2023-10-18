//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import { AxelarExecutable } from "@axelarnetwork/contracts/executable/AxelarExecutable.sol";

contract MessageReceiver is AxelarExecutable {
  bytes32 validSourceChainHash;
  bytes32 validSourceAddressHash;

  error BadMessageOrigin();
  error BadExecution();

  constructor(string memory _validSourceChain, string memory _validSourceAddress, address _gateway)
    AxelarExecutable(_gateway)
  {
    validSourceChainHash = keccak256(abi.encodePacked(_validSourceChain));
    validSourceAddressHash = keccak256(abi.encodePacked(_validSourceAddress));
  }

  function _execute(
    string calldata _sourceChain,
    string calldata _sourceAddress,
    bytes calldata _payload
  ) internal override {
    if (
      keccak256(abi.encodePacked(_sourceChain)) != validSourceChainHash
        || keccak256(abi.encodePacked(_sourceAddress)) != validSourceAddressHash
    ) {
      revert BadMessageOrigin();
    }

    (address target, bytes memory targetPayload) = abi.decode(_payload, (address, bytes));

    (bool success, bytes memory returnData) = target.call(targetPayload);
    returnData;
    if (!success) {
      revert BadExecution();
    }
  }
}
