//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import "./BaseTest.sol";

contract BaseTestMerkleDistributor is BaseTest {
  address internal immutable ISSUER = makeAddr("issuer");
  address internal immutable DAO = makeAddr("DAO");
  uint256 internal constant SUPPLY = 100_000_000 ether;
  address internal immutable RECIPIENT = makeAddr("recipient");
  bytes32 internal constant ZERO_BYTES = bytes32(0);
  uint256 internal constant AIRDROP_SUPPLY = 4_000_000 ether;

  // Events for testing
  event Claimed(uint256 index, address account, uint256 amount);

  address[] public ALL_ADDRESSES = [
    0x72e37d393c70823113a7176aC1F7C579d2C5623E,
    0xF49b089183Ec02baD392630a82C0f5B5C3BfAbe9,
    0xa670a43859bBa57dA9F0A275B601A3F0AcccD41a,
    0xd6BD0AA9EC3b00a11c9b56263Ba730d3c1A82b18
  ];

  function _toNode(uint256 index, address account, uint256 amount) internal pure returns (bytes32) {
    bytes memory encoded = abi.encodePacked(index, account, amount);
    bytes32 hash = keccak256(encoded);
    return hash;
  }

  function _getDefaultData() internal view returns (bytes32[] memory) {
    uint256[4] memory quantities;
    quantities[0] = 1;
    quantities[1] = 1;
    quantities[2] = 1;
    quantities[3] = 1;

    // Ordered default data
    // 0x38ef6639314a94280bc759ec85101693f79bb0e5cd6a89f9da6abfbcf9e77258
    // 0x466651d60b5e028cbecf11374b5dc6fd5ce6b98494d98f13315abb894f424a83
    // 0x52f7cdc12aa9dfcf2080828e0bcf19a3ec7c7745600261e14463a4d33166e2f9
    // 0x57a7bef5560725608a2b39764922e0734d68404749c1618c5d859d2e6d6d24a2

    return _getDataWith(quantities);
  }

  function _getDataWith(uint256[4] memory _quantities) internal view returns (bytes32[] memory) {
    bytes32 node1 = _toNode(0, ALL_ADDRESSES[0], _quantities[0]);
    bytes32 node2 = _toNode(1, ALL_ADDRESSES[1], _quantities[1]);
    bytes32 node3 = _toNode(2, ALL_ADDRESSES[2], _quantities[2]);
    bytes32 node4 = _toNode(3, ALL_ADDRESSES[3], _quantities[3]);

    console.log("Nodes");
    console.logBytes32(node1);
    console.logBytes32(node2);
    console.logBytes32(node3);
    console.logBytes32(node4);

    bytes32[] memory nonOrderedData = new bytes32[](4);
    nonOrderedData[0] = node1;
    nonOrderedData[1] = node2;
    nonOrderedData[2] = node3;
    nonOrderedData[3] = node4;

    bytes32[] memory orderedData = _orderBytes32(nonOrderedData);

    console.log("Ordered Nodes");
    console.logBytes32(orderedData[0]);
    console.logBytes32(orderedData[1]);
    console.logBytes32(orderedData[2]);
    console.logBytes32(orderedData[3]);

    return orderedData;
  }

  function _orderBytes32(bytes32[] memory values) public pure returns (bytes32[] memory) {
    for (uint256 i = 0; i < values.length - 1; i++) {
      for (uint256 j = i + 1; j < values.length; j++) {
        if (values[i] > values[j]) {
          (values[i], values[j]) = (values[j], values[i]);
        }
      }
    }
    return values;
  }
}
