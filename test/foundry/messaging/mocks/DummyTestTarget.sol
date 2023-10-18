//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

contract DummyTestTarget {
  uint256 public someValue;
  uint256 public someOtherValue;

  function setSomeValue(uint256 _someValue) public {
    someValue = _someValue;
  }

  function setSomeOtherValue(uint256 _someOtherValue) public {
    someOtherValue = _someOtherValue;
  }
}
