//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import { MurkyBase } from "@murky/common/MurkyBase.sol";

contract ModifiedMerkleTree is MurkyBase {
  function hashLeafPairs(bytes32 left, bytes32 right) public pure override returns (bytes32 _hash) {
    if (left < right) {
      return keccak256(abi.encodePacked(left, right));
    } else {
      return keccak256(abi.encodePacked(right, left));
    }
  }
}
