//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import { BaseTest } from "../../BaseTest.sol";
import { MessageRelayer } from "contracts/messaging/MessageRelayer.sol";
import { MessageReceiverTest } from "../mocks/MessageReceiverTest.sol";
import { AxelarGatewayMock } from "../mocks/AxelarGatewayMock.sol";
import { DummyTestTarget } from "../mocks/DummyTestTarget.sol";

contract BaseMessagingTest is BaseTest {
  address internal normalGuy;

  MessageRelayer internal relayer;
  MessageReceiverTest internal receiver;
  AxelarGatewayMock internal gateway;
  DummyTestTarget internal target;

  string constant DESTINATION_CHAIN = "moonbeam";
  string constant DESTINATION_MESSAGE_RECEIVER_ADDRESS =
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  string constant RECEIVER_SOURCE_ADDRESS = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

  function _setUp() internal {
    _setupAccounts();
    _deploy();
  }

  function _deploy() internal {
    gateway = new AxelarGatewayMock();
    relayer = new MessageRelayer(
            address(gateway),
            address(0),
            address(this)
        );
    receiver = new MessageReceiverTest(
            DESTINATION_CHAIN,
            RECEIVER_SOURCE_ADDRESS,
            address(gateway)
        );
    target = new DummyTestTarget();
  }

  function _setupAccounts() internal {
    normalGuy = makeAddr("normalGuy");
  }
}
