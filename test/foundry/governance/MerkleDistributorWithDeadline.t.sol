//SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.19;

import { BaseTestMerkleDistributor } from "../BaseTestMerkleDistributor.sol";
import { CoraToken } from "contracts/governance/CoraToken.sol";
import { AlreadyClaimed, InvalidProof } from "contracts/governance/MerkleDistributor.sol";

import "contracts/governance/MerkleDistributorWithDeadline.sol";
import { ModifiedMerkleTree } from "../ModifiedMerkleTree.sol";

contract MerkleDistributorWithDeadlineTest is BaseTestMerkleDistributor {
  MerkleDistributorWithDeadline distributor;
  GovernanceInitiationData initiationData;
  CoraToken token;

  // Test events
  event Transfer(address indexed from, address indexed to, uint256 value);

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

    distributor = new MerkleDistributorWithDeadline(
            initiationData,
            _merkleRoot
        );

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

  function testProperties() public {
    assertEq(distributor.token(), address(token));
    assertEq(distributor.merkleRoot(), bytes32(0));
    assertEq(distributor.endTime(), block.timestamp + 14 days);
  }

  // claim
  function testCannotClaimAfterWindow_reverts() public {
    ModifiedMerkleTree m = new ModifiedMerkleTree();
    bytes32[] memory data = _getDefaultData();

    // Get Root
    bytes32 root = m.getRoot(data);

    // Redeploy
    _setup(root);

    _increaseTimeBy(15 days); // @dev end time is 14 days

    // Claim as 0x72e37d393c70823113a7176aC1F7C579d2C5623E => node1
    uint256 node1Index = 0;

    // Get proof
    bytes32[] memory proof0 = m.getProof(data, node1Index); // will get proof for node1
    bool verified0 = m.verifyProof(root, proof0, data[0]);

    // Verify
    assertTrue(verified0);

    vm.startPrank(0x72e37d393c70823113a7176aC1F7C579d2C5623E);

    vm.expectRevert(ClaimWindowFinished.selector);
    distributor.claim(node1Index, 0x72e37d393c70823113a7176aC1F7C579d2C5623E, 1, proof0);
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

  function testClaim_reverts_for_empty_proof() public {
    uint256 index = 0;
    uint256 amount = 1;
    bytes32[] memory proof = new bytes32[](0);

    vm.expectRevert(InvalidProof.selector);
    distributor.claim(index, ALL_ADDRESSES[0], amount, proof);
  }

  // withdraw
  function testOnlyDAOCanWithdraw_reverts() public {
    vm.startPrank(0x72e37d393c70823113a7176aC1F7C579d2C5623E);
    vm.expectRevert(OnlyDAO.selector);
    distributor.withdraw();
  }

  function testOnlyDAOCanWithdrawAfterEndTime_reverts() public {
    _increaseTimeBy(15 days); // @dev end time is 15 days

    vm.startPrank(0x72e37d393c70823113a7176aC1F7C579d2C5623E);
    vm.expectRevert(OnlyDAO.selector);
    distributor.withdraw();
    vm.stopPrank();
  }

  function testCannotWithdrawDuringClaimWindow_reverts() public {
    vm.startPrank(DAO);
    vm.expectRevert(NoWithdrawDuringClaim.selector);
    distributor.withdraw();

    vm.stopPrank();
  }

  function testDAOCanWithdrawAfterEndTime() public {
    _increaseTimeBy(15 days); // @dev end time is 14 days

    vm.startPrank(DAO);
    vm.expectEmit(true, true, false, true);
    emit Transfer(address(distributor), address(DAO), AIRDROP_SUPPLY);

    distributor.withdraw();

    assertEq(token.balanceOf(DAO), SUPPLY);
    assertEq(token.balanceOf(address(distributor)), 0);

    vm.stopPrank();
  }
}
