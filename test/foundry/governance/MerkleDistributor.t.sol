//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import { BaseTestMerkleDistributor } from "../BaseTestMerkleDistributor.sol";
import { GovernanceInitiationData } from "contracts/governance/GovernanceInitiationData.sol";
import { CoraToken } from "contracts/governance/CoraToken.sol";

import "contracts/governance/MerkleDistributorWithDeadline.sol";
import "contracts/governance/MerkleDistributor.sol";

import { ModifiedMerkleTree } from "../ModifiedMerkleTree.sol";

contract MerkleDistributorTest is BaseTestMerkleDistributor {
  MerkleDistributor distributor;
  GovernanceInitiationData initiationData;
  CoraToken token;

  function setUp() public {
    _setup(ZERO_BYTES);
  }

  function _setup(bytes32 _merkleRoot) internal {
    vm.startPrank(ISSUER);

    initiationData = new GovernanceInitiationData();

    // @dev We compute the address for the cora token
    uint256 deployerNonce = vm.getNonce(ISSUER);
    address tokenExpectedAddress = computeCreateAddress(ISSUER, deployerNonce + 1);
    // @dev Setup initiation contract
    initiationData.populate(
      GovernanceInitiationData.SetupData({
        tokenAddress: tokenExpectedAddress,
        timelockAddress: DAO, // @dev We say the DAO is the timelock controller
        governorAddress: address(0) // @dev No governor
       })
    );

    distributor = new MerkleDistributor(initiationData, _merkleRoot);

    // we give all the supply minus the Airdrop Supply to the DAO
    CoraToken.Recipient memory daoRecipient = CoraToken.Recipient(DAO, SUPPLY - AIRDROP_SUPPLY);
    CoraToken.Recipient memory distributorRecipient =
      CoraToken.Recipient(address(distributor), AIRDROP_SUPPLY);

    CoraToken.Recipient[] memory recipients = new CoraToken.Recipient[](2);
    recipients[0] = daoRecipient;
    recipients[1] = distributorRecipient;

    token = new CoraToken(initiationData, recipients);

    vm.stopPrank();
  }

  function testBalance() public {
    assertEq(token.balanceOf(address(distributor)), AIRDROP_SUPPLY);
  }

  function testProperties() public {
    assertEq(distributor.token(), address(token));
    assertEq(distributor.merkleRoot(), bytes32(0));
  }

  // claim
  function testClaim_reverts_for_empty_proof() public {
    uint256 index = 0;
    uint256 amount = 10;
    bytes32[] memory proof = new bytes32[](0);

    vm.expectRevert(InvalidProof.selector);
    distributor.claim(index, RECIPIENT, amount, proof);
  }

  function testClaim_reverts_for_invalid_index() public {
    uint256 index = 1;
    uint256 amount = 10;
    bytes32[] memory proof = new bytes32[](0);

    vm.expectRevert(InvalidProof.selector);
    distributor.claim(index, RECIPIENT, amount, proof);
  }

  function testRoot() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();
    bytes32[] memory data = _getDefaultData();

    // Get Root, Proof, and Verify
    bytes32 root = m.getRoot(data);
    assertEq(root, 0x204331e0d67c548b583b71d8c1864a5e3939c7cf1a06795879f32e458ef0cff0);

    bytes32[] memory proof = m.getProof(data, 2); // will get proof for 0x2 value
    bool verified = m.verifyProof(root, proof, data[2]); // true!
    assertTrue(verified);
  }

  function testClaim() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();
    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 root = m.getRoot(data);

    // Redeploy
    _setup(root);

    // Claim as 0x72e37d393c70823113a7176aC1F7C579d2C5623E => node1
    uint256 node1Index = 0;

    // Get proof
    bytes32[] memory proof0 = m.getProof(data, node1Index); // will get proof for node1
    bool verified0 = m.verifyProof(root, proof0, data[0]);

    // Verify
    assertTrue(verified0);

    vm.startPrank(0x72e37d393c70823113a7176aC1F7C579d2C5623E);

    // @dev event Claimed(uint256 index, address account, uint256 amount);
    vm.expectEmit(false, false, false, true);
    emit Claimed(node1Index, 0x72e37d393c70823113a7176aC1F7C579d2C5623E, 1);

    distributor.claim(node1Index, 0x72e37d393c70823113a7176aC1F7C579d2C5623E, 1, proof0);

    assertEq(token.balanceOf(0x72e37d393c70823113a7176aC1F7C579d2C5623E), 1);
    assertEq(token.balanceOf(address(distributor)), AIRDROP_SUPPLY - 1);

    // assert is claimed
    assertEq(distributor.isClaimed(node1Index), true);
  }

  function testCannotClaimMoreThanOnce_reverts() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();
    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 root = m.getRoot(data);

    // Redeploy
    _setup(root);

    // Claim as 0x72e37d393c70823113a7176aC1F7C579d2C5623E => node1
    uint256 node1Index = 0;
    bytes32[] memory proof0 = m.getProof(data, node1Index); // will get proof for node1
    bool verified0 = m.verifyProof(root, proof0, data[0]); // true!
    assertTrue(verified0);

    vm.prank(0x72e37d393c70823113a7176aC1F7C579d2C5623E);
    distributor.claim(node1Index, 0x72e37d393c70823113a7176aC1F7C579d2C5623E, 1, proof0);

    vm.expectRevert(AlreadyClaimed.selector);
    distributor.claim(node1Index, 0x72e37d393c70823113a7176aC1F7C579d2C5623E, 1, proof0);
  }

  function testCannotClaimForSomeoneElseAddress_reverts() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();
    bytes32[] memory data = _getDefaultData();

    // Get root
    bytes32 root = m.getRoot(data);

    // Redeploy
    _setup(root);

    // Claim as 0xF49b089183Ec02baD392630a82C0f5B5C3BfAbe9 => node2
    uint256 node1Index = 0;
    bytes32[] memory proof0 = m.getProof(data, node1Index); // will get proof for node1
    bool verified0 = m.verifyProof(root, proof0, data[0]); // true!
    assertTrue(verified0);

    vm.expectRevert(InvalidProof.selector);
    vm.prank(0xF49b089183Ec02baD392630a82C0f5B5C3BfAbe9);

    // @dev trying to claim using a different address
    distributor.claim(node1Index, 0xF49b089183Ec02baD392630a82C0f5B5C3BfAbe9, 1, proof0);
  }

  function testCannotClaimMoreThanProof_reverts() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();
    bytes32[] memory data = _getDefaultData();

    // Get Root, Proof, and Verify
    bytes32 root = m.getRoot(data);

    // Redeploy
    _setup(root);

    // Claim as 0x72e37d393c70823113a7176aC1F7C579d2C5623E => node1
    uint256 node1Index = 0;
    bytes32[] memory proof0 = m.getProof(data, node1Index); // will get proof for node1
    bool verified0 = m.verifyProof(root, proof0, data[0]); // true!
    assertTrue(verified0);

    vm.expectRevert(InvalidProof.selector);
    vm.prank(0x72e37d393c70823113a7176aC1F7C579d2C5623E);

    // @dev trying to claim more than proof
    distributor.claim(node1Index, 0x72e37d393c70823113a7176aC1F7C579d2C5623E, 100, proof0);
  }

  function testContractMushHaveEnoughToTransfer_reverts() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();
    bytes32[] memory data = _getDataWith([SUPPLY + 1, 1, 1, 1]);

    // Get Root, Proof, and Verify
    bytes32 root = m.getRoot(data);

    // Redeploy
    _setup(root);

    // Claim as 0x72e37d393c70823113a7176aC1F7C579d2C5623E => node3 for SUPPLY + 1 (check Ordered nodes logs)
    uint256 nodeIndex = 3; //
    bytes32[] memory proof3 = m.getProof(data, nodeIndex);
    // will get proof for node3 due to the ordering of the nodes when using SUPPLY + 1
    bool verified0 = m.verifyProof(root, proof3, data[3]);

    // Verify
    assertTrue(verified0);

    vm.startPrank(0x72e37d393c70823113a7176aC1F7C579d2C5623E);

    vm.expectRevert("ERC20: transfer amount exceeds balance");
    // @dev Be aware index is 0 based on the _toNode call to calculate the item hash
    distributor.claim(0, 0x72e37d393c70823113a7176aC1F7C579d2C5623E, SUPPLY + 1, proof3);
    vm.stopPrank();
  }

  function testAllCanClaim() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();
    bytes32[] memory data = _getDataWith([uint256(1), 1, 1, 1]);

    // Get Root, Proof, and Verify
    bytes32 root = m.getRoot(data);

    // Redeploy
    _setup(root);

    // Verify all proofs
    for (uint256 i = 0; i < ALL_ADDRESSES.length; i++) {
      bytes32[] memory proof = m.getProof(data, i);
      bool verified = m.verifyProof(root, proof, data[i]);
      assertTrue(verified);
    }

    vm.prank(ALL_ADDRESSES[0]);
    address account1 = ALL_ADDRESSES[0];
    distributor.claim(0, account1, 1, m.getProof(data, 0));

    vm.prank(ALL_ADDRESSES[1]);
    address account2 = ALL_ADDRESSES[1];
    distributor.claim(1, account2, 1, m.getProof(data, 3));

    vm.prank(ALL_ADDRESSES[2]);
    address account3 = ALL_ADDRESSES[2];
    distributor.claim(2, account3, 1, m.getProof(data, 2));

    vm.prank(ALL_ADDRESSES[3]);
    address account4 = ALL_ADDRESSES[3];
    distributor.claim(3, account4, 1, m.getProof(data, 1));
  }

  function testAllCanOnlyClaimOnce_reverts() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();
    bytes32[] memory data = _getDataWith([uint256(1), 1, 1, 1]);

    // Get Root
    bytes32 root = m.getRoot(data);

    // Redeploy
    _setup(root);

    // Account 1
    {
      uint256 accountNumber = 0;
      address account = ALL_ADDRESSES[accountNumber];
      uint256 index = 0;
      uint256 amount = 1;
      vm.startPrank(account);

      bytes32[] memory proof = m.getProof(data, index);

      distributor.claim(accountNumber, account, amount, proof);

      vm.expectRevert(AlreadyClaimed.selector);

      distributor.claim(accountNumber, account, amount, proof);

      vm.stopPrank();
    }
    // Acccount 2
    {
      uint256 accountNumber = 1;
      address account = ALL_ADDRESSES[accountNumber];
      uint256 index = 3;
      uint256 amount = 1;
      vm.startPrank(account);

      bytes32[] memory proof = m.getProof(data, index);

      distributor.claim(accountNumber, account, amount, proof);

      vm.expectRevert(AlreadyClaimed.selector);

      distributor.claim(accountNumber, account, amount, proof);

      vm.stopPrank();
    }
    // Acccount 3
    {
      uint256 accountNumber = 2;
      address account = ALL_ADDRESSES[accountNumber];
      uint256 index = 2;
      uint256 amount = 1;
      vm.startPrank(account);

      bytes32[] memory proof = m.getProof(data, index);

      distributor.claim(accountNumber, account, amount, proof);

      vm.expectRevert(AlreadyClaimed.selector);

      distributor.claim(accountNumber, account, amount, proof);

      vm.stopPrank();
    }
    // Acccount 4
    {
      uint256 accountNumber = 3;
      address account = ALL_ADDRESSES[accountNumber];
      uint256 index = 1;
      uint256 amount = 1;
      vm.startPrank(account);

      bytes32[] memory proof = m.getProof(data, index);

      distributor.claim(accountNumber, account, amount, proof);

      vm.expectRevert(AlreadyClaimed.selector);

      distributor.claim(accountNumber, account, amount, proof);

      vm.stopPrank();
    }
  }
}
