//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import { MessageReceiver } from "contracts/messaging/MessageReceiver.sol";

contract MessageReceiverTest is MessageReceiver {
  constructor(string memory _validSourceChain, string memory _validSourceAddress, address _gateway)
    MessageReceiver(_validSourceChain, _validSourceAddress, _gateway)
  { }

  function testExecute(
    string calldata _sourceChain,
    string calldata _sourceAddress,
    bytes calldata _payload
  ) public {
    _execute(_sourceChain, _sourceAddress, _payload);
  }
}
