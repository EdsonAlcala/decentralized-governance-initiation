//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

contract DummyDaoTargetTester {
  uint256 public _normalData;
  uint256 public _highData;
  uint256 public _lowData;
  uint256 public _unknownData;

  function normalFunction(uint256 newNormalData) external {
    _normalData = newNormalData;
  }

  function highFunction(uint256 newHighData) external {
    _highData = newHighData;
  }

  function lowFunction(uint256 newLowData) external {
    _lowData = newLowData;
  }

  function unknownFunction(uint256 newData) external {
    _unknownData = newData;
  }
}
