//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import "forge-std/Test.sol";

contract BaseTest is Test {
  function _increaseTimeBy(uint256 _time) internal {
    vm.warp(block.timestamp + _time);
  }

  function _waitBlocks(uint256 _blocks) internal {
    vm.roll(block.number + _blocks);
  }
}
