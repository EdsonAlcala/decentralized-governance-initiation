//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import { BaseMessagingTest } from "./helpers/BaseMessagingTest.sol";
import { DummyTestTarget } from "./mocks/DummyTestTarget.sol";

contract MessagingTest is BaseMessagingTest {
  address[] private targetAddressArr;
  uint256[] newSomeValueParam;
  uint256 newSomeValue = 1337;
  uint256[] newSomeOtherValueParam;
  uint256 newSomeOtherValue = 0xc0ffee;

  function setUp() public {
    super._setUp();
    delete targetAddressArr;
    delete newSomeValue;
    delete newSomeOtherValue;
    targetAddressArr.push(address(target));
    newSomeValueParam.push(newSomeValue);
    newSomeOtherValueParam.push(newSomeOtherValue);
  }

  function testSetSomeValue() public {
    uint256 someValueBefore = target.someValue();

    bytes memory targetSetSomeValuePayload =
      abi.encodeWithSelector(DummyTestTarget.setSomeValue.selector, newSomeOtherValue);
    // the message receiver expects a payload of (address, bytes), being the address the contract that will be called
    bytes memory receiverPayload = abi.encode(address(target), targetSetSomeValuePayload);
    relayer.sendMessage(DESTINATION_CHAIN, DESTINATION_MESSAGE_RECEIVER_ADDRESS, receiverPayload);

    (string memory destinationChain, string memory contractAddress, bytes memory payload) =
      gateway.lastCallContract();

    (address targetAddress, bytes memory targetPayload) = abi.decode(payload, (address, bytes));

    receiver.testExecute(DESTINATION_CHAIN, RECEIVER_SOURCE_ADDRESS, payload);
    uint256 someValueAfter = target.someValue();
    uint256 someOtherValueAfter = target.someOtherValue();

    assertEq(destinationChain, DESTINATION_CHAIN);
    assertEq(contractAddress, DESTINATION_MESSAGE_RECEIVER_ADDRESS);
    assertEq(targetAddress, address(target));
    assertEq(targetPayload, targetSetSomeValuePayload);
    assertEq(someValueBefore, 0);
    assertEq(someValueAfter, newSomeValue);
    assertEq(someOtherValueAfter, 0);
  }

  function testSetSomeOtherValue() public {
    uint256 someOtherValueBefore = target.someOtherValue();

    bytes memory targetSetSomeOtherValuePayload =
      abi.encodeWithSelector(DummyTestTarget.setSomeOtherValue.selector, newSomeValue);
    // the message receiver expects a payload of (address, bytes), being the address the contract that will be called
    bytes memory receiverPayload = abi.encode(address(target), targetSetSomeOtherValuePayload);
    relayer.sendMessage(DESTINATION_CHAIN, DESTINATION_MESSAGE_RECEIVER_ADDRESS, receiverPayload);

    (string memory destinationChain, string memory contractAddress, bytes memory payload) =
      gateway.lastCallContract();

    (address targetAddress, bytes memory targetPayload) = abi.decode(payload, (address, bytes));

    receiver.testExecute(DESTINATION_CHAIN, RECEIVER_SOURCE_ADDRESS, payload);
    uint256 someValueAfter = target.someValue();
    uint256 someOtherValueAfter = target.someOtherValue();

    assertEq(destinationChain, DESTINATION_CHAIN);
    assertEq(contractAddress, DESTINATION_MESSAGE_RECEIVER_ADDRESS);
    assertEq(targetAddress, address(target));
    assertEq(targetPayload, targetSetSomeOtherValuePayload);
    assertEq(someOtherValueBefore, 0);
    assertEq(someValueAfter, 0);
    assertEq(someOtherValueAfter, newSomeOtherValue);
  }

  function testSendMessageOnlyOwner() public {
    vm.expectRevert("Ownable: caller is not the owner");
    vm.prank(normalGuy);
    relayer.sendMessage(DESTINATION_CHAIN, DESTINATION_MESSAGE_RECEIVER_ADDRESS, new bytes(0));
  }
}
