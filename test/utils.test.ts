import { expect } from 'chai';
import hre from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { getAdvisorsVestingsBytecodeAndExpectedAddress, getAirdropBytecodeAndExpectedAddress, getCoraTokenBytecodeAndExpectedAddress, getGovernanceInitiationDataBytecodeAndExpectedAddress, getGovernanceInitiationDataDeployerBytecodeAndExpectedAddress, getGovernorBytecodeAndExpectedAddress, getMessageRelayerDeploymentBytecodeAndExpectedAddress, getTeamVestingBytecodeAndExpectedAddress, getTimelockControllerBytecodeAndExpectedAddress, getTreasuryBootstrappingByteCodeAndExpectedAddress, getVestingForDAOBytecodeAndExpectedAddress } from '../src/utils';
import { AIRDROP_EXPECTED_ADDRESS, CORA_TOKEN_EXPECTED_ADDRESS, GOVERNANCE_INITIATION_DATA_DEPLOYER_EXPECTED_ADDRESS, GOVERNANCE_INITIATION_EXPECTED_ADDRESS, GOVERNOR_EXPECTED_ADDRESS, MESSAGE_RELAYER_EXPECTED_ADDRESS, TIMELOCK_CONTROLLED_EXPECTED_ADDRESS, TREASURY_BOOTSTRAPPING_EXPECTED_ADDRESS, VESTING_FOR_ADVISORS_EXPECTED_ADDRESS, VESTING_FOR_DAO_EXPECTED_ADDRESS, VESTING_FOR_DEVELOPMENT_TEAM_EXPECTED_ADDRESS } from '../constants';
import { CoraGovernorParams, DeploymentConfig, Recipient } from '../config/types';
import { DeploymentConfiguration } from '../config';
import { parseBalanceMap } from '../src/parse-balance-map';
import { PRODUCTION_CONFIG } from '../config/production';

describe('Utils tests', () => {
    let config: DeploymentConfig;
    let chainId: number;
    let accounts: SignerWithAddress[]
    before(async () => {
        accounts = await hre.ethers.getSigners();
        chainId = Number(await hre.getChainId())
        config = new DeploymentConfiguration(chainId).getDeploymentConfig();
    });

    it('getGovernanceInitiationDataBytecodeAndExpectedAddress', async function () {
        const { governanceInitiationDataExpectedAddress, governanceInitiationDataBytecode } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);

        expect(governanceInitiationDataExpectedAddress).to.equal(GOVERNANCE_INITIATION_EXPECTED_ADDRESS)
    });

    it('getTreasuryBootstrappingByteCodeAndExpectedAddress', async function () {
        const { governanceInitiationDataExpectedAddress } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);

        const { treasuryBootstrappingExpectedAddress, treasuryBootstrappingDeploymentBytecode } = await getTreasuryBootstrappingByteCodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);

        expect(treasuryBootstrappingExpectedAddress).to.equal(TREASURY_BOOTSTRAPPING_EXPECTED_ADDRESS)
    });

    it('getTeamVestingBytecodeAndExpectedAddress', async function () {
        const { governanceInitiationDataExpectedAddress } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);

        const { vestingForTeamExpectedAddress, vestingForTheTeamBytecode } = await getTeamVestingBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);

        expect(vestingForTeamExpectedAddress).to.equal(VESTING_FOR_DEVELOPMENT_TEAM_EXPECTED_ADDRESS)
    });

    it('getTimelockControllerBytecodeAndExpectedAddress', async function () {
        const { governanceInitiationDataExpectedAddress } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);
        const { coraTimelockControllerDeploymentBytecode, coraTimelockControllerExpectedAddress } = await getTimelockControllerBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);

        expect(coraTimelockControllerExpectedAddress).to.equal(TIMELOCK_CONTROLLED_EXPECTED_ADDRESS)
    });

    it('getMessageRelayerDeploymentBytecodeAndExpectedAddress', async function () {
        const { governanceInitiationDataExpectedAddress } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);
        const { coraTimelockControllerDeploymentBytecode, coraTimelockControllerExpectedAddress } = await getTimelockControllerBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        const { messageRelayerExpectedAddress, messageRelayerDeploymentBytecode } = await getMessageRelayerDeploymentBytecodeAndExpectedAddress(hre, coraTimelockControllerExpectedAddress);

        expect(messageRelayerExpectedAddress).to.equal(MESSAGE_RELAYER_EXPECTED_ADDRESS)
    });

    it('getVestingForDAOBytecodeAndExpectedAddress', async function () {
        const { governanceInitiationDataExpectedAddress } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);
        const { coraTimelockControllerExpectedAddress } = await getTimelockControllerBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);

        const { vestingForDAOExpectedAddress, vestingForDAODeploymentBytecode } = await getVestingForDAOBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, coraTimelockControllerExpectedAddress);

        expect(vestingForDAOExpectedAddress).to.equal(VESTING_FOR_DAO_EXPECTED_ADDRESS)
        // expect(vestingForDAODeploymentBytecode).to.equal("") TODO
    });

    it('getAdvisorsVestingsBytecodeAndExpectedAddress', async function () {
        const { governanceInitiationDataExpectedAddress } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);
        const { advisorsVestingDeploymentBytecode, advisorsVestingExpectedAddress, advisorsAddressesWithAmount } = await getAdvisorsVestingsBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);

        expect(advisorsVestingExpectedAddress.length).to.equal(5)
        expect(advisorsVestingExpectedAddress[0]).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[0])
        expect(advisorsVestingExpectedAddress[1]).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[1])
        expect(advisorsVestingExpectedAddress[2]).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[2])
        expect(advisorsVestingExpectedAddress[3]).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[3])
        expect(advisorsVestingExpectedAddress[4]).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[4])
        expect(advisorsAddressesWithAmount[0].address).to.equal(PRODUCTION_CONFIG.vesting.advisors[0].address)
        expect(advisorsAddressesWithAmount[1].address).to.equal(PRODUCTION_CONFIG.vesting.advisors[1].address)
        expect(advisorsAddressesWithAmount[2].address).to.equal(PRODUCTION_CONFIG.vesting.advisors[2].address)
        expect(advisorsAddressesWithAmount[3].address).to.equal(PRODUCTION_CONFIG.vesting.advisors[3].address)
        expect(advisorsAddressesWithAmount[4].address).to.equal(PRODUCTION_CONFIG.vesting.advisors[4].address)
    });

    it('getAirdropBytecodeAndExpectedAddress', async function () {
        const { governanceInitiationDataExpectedAddress } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);
        const { merkleRoot } = parseBalanceMap(config.airdrop.addresses)

        const { airdropDeploymentBytecode, airdropExpectedAddress } = await getAirdropBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, merkleRoot);

        expect(airdropExpectedAddress).to.equal(AIRDROP_EXPECTED_ADDRESS)
    })

    it('getCoraTokenBytecodeAndExpectedAddress', async function () {
        const { governanceInitiationDataExpectedAddress } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);
        const { treasuryBootstrappingExpectedAddress } = await getTreasuryBootstrappingByteCodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        const { vestingForTeamExpectedAddress } = await getTeamVestingBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        const { coraTimelockControllerExpectedAddress } = await getTimelockControllerBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        const { vestingForDAOExpectedAddress } = await getVestingForDAOBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, coraTimelockControllerExpectedAddress);
        const { advisorsRecipients } = await getAdvisorsVestingsBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        const { merkleRoot } = parseBalanceMap(config.airdrop.addresses)
        const { airdropExpectedAddress } = await getAirdropBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, merkleRoot);

        const recipients: Recipient[] = []

        recipients.push({
            address: treasuryBootstrappingExpectedAddress,
            amount: config.treasuryBootstrapping.total
        });

        recipients.push({
            address: vestingForTeamExpectedAddress,
            amount: config.vesting.team.amount
        });

        recipients.push({
            address: vestingForDAOExpectedAddress,
            amount: config.vesting.dao.amount
        });

        recipients.push(...advisorsRecipients);

        recipients.push({
            address: airdropExpectedAddress,
            amount: config.airdrop.total
        });

        const { coraTokenExpectedAddress, coraTokenDeploymentBytecode } = await getCoraTokenBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, recipients);

        expect(coraTokenExpectedAddress).to.equal(CORA_TOKEN_EXPECTED_ADDRESS)
    })

    it('getGovernorBytecodeAndExpectedAddress', async function () {
        const { governanceInitiationDataExpectedAddress } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);
        const { treasuryBootstrappingExpectedAddress } = await getTreasuryBootstrappingByteCodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        const { vestingForTeamExpectedAddress } = await getTeamVestingBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        const { coraTimelockControllerExpectedAddress } = await getTimelockControllerBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        const { vestingForDAOExpectedAddress } = await getVestingForDAOBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, coraTimelockControllerExpectedAddress);
        const { advisorsRecipients } = await getAdvisorsVestingsBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        const { merkleRoot } = parseBalanceMap(config.airdrop.addresses)
        const { airdropExpectedAddress } = await getAirdropBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, merkleRoot);
        const { messageRelayerExpectedAddress } = await getMessageRelayerDeploymentBytecodeAndExpectedAddress(hre, coraTimelockControllerExpectedAddress);

        const recipients: Recipient[] = []

        recipients.push({
            address: treasuryBootstrappingExpectedAddress,
            amount: config.treasuryBootstrapping.total
        });

        recipients.push({
            address: vestingForTeamExpectedAddress,
            amount: config.vesting.team.amount
        });

        recipients.push({
            address: vestingForDAOExpectedAddress,
            amount: config.vesting.dao.amount
        });

        recipients.push(...advisorsRecipients);

        recipients.push({
            address: airdropExpectedAddress,
            amount: config.airdrop.total
        });

        const { coraTokenExpectedAddress } = await getCoraTokenBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, recipients);

        const governorParameters: CoraGovernorParams = {
            token: coraTokenExpectedAddress,
            timelock: coraTimelockControllerExpectedAddress,
            messageRelayer: messageRelayerExpectedAddress,
            functionSignatures: config.timelockController.initialSignatures,
            functionsDelays: config.timelockController.initialDelays,
            shortDelay: config.timelockController.shortDelay,
            defaultDelay: config.timelockController.defaultDelay,
            longDelay: config.timelockController.longDelay,
            initialVotingDelay: config.timelockController.initialVotingDelay,
            initialVotingPeriod: config.timelockController.initialVotingPeriod,
            initialProposalThreshold: config.timelockController.initialProposalThreshold,
            quorumNumeratorValue: config.timelockController.quorumNumeratorValue
        };

        const { coraGovernorDeploymentBytecode, coraGovernorExpectedAddress } = await getGovernorBytecodeAndExpectedAddress(hre, governorParameters);

        expect(coraGovernorExpectedAddress).to.equal(GOVERNOR_EXPECTED_ADDRESS)
    })

    it('getGovernanceInitiationDataDeployerBytecodeAndExpectedAddress', async function () {
        const { governanceInitiationDataBytecode } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);

        const { governanceInitiationDataExpectedAddress } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);
        const { treasuryBootstrappingExpectedAddress } = await getTreasuryBootstrappingByteCodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        const { vestingForTeamExpectedAddress } = await getTeamVestingBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        const { coraTimelockControllerExpectedAddress } = await getTimelockControllerBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        const { vestingForDAOExpectedAddress } = await getVestingForDAOBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, coraTimelockControllerExpectedAddress);
        const { advisorsRecipients } = await getAdvisorsVestingsBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        const { merkleRoot } = parseBalanceMap(config.airdrop.addresses)
        const { airdropExpectedAddress } = await getAirdropBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, merkleRoot);
        const { messageRelayerExpectedAddress } = await getMessageRelayerDeploymentBytecodeAndExpectedAddress(hre, coraTimelockControllerExpectedAddress);

        const recipients: Recipient[] = []

        recipients.push({
            address: treasuryBootstrappingExpectedAddress,
            amount: config.treasuryBootstrapping.total
        });

        recipients.push({
            address: vestingForTeamExpectedAddress,
            amount: config.vesting.team.amount
        });

        recipients.push({
            address: vestingForDAOExpectedAddress,
            amount: config.vesting.dao.amount
        });

        recipients.push(...advisorsRecipients);

        recipients.push({
            address: airdropExpectedAddress,
            amount: config.airdrop.total
        });

        const { coraTokenExpectedAddress } = await getCoraTokenBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, recipients);

        const governorParameters: CoraGovernorParams = {
            token: coraTokenExpectedAddress,
            timelock: coraTimelockControllerExpectedAddress,
            messageRelayer: messageRelayerExpectedAddress,
            functionSignatures: config.timelockController.initialSignatures,
            functionsDelays: config.timelockController.initialDelays,
            shortDelay: config.timelockController.shortDelay,
            defaultDelay: config.timelockController.defaultDelay,
            longDelay: config.timelockController.longDelay,
            initialVotingDelay: config.timelockController.initialVotingDelay,
            initialVotingPeriod: config.timelockController.initialVotingPeriod,
            initialProposalThreshold: config.timelockController.initialProposalThreshold,
            quorumNumeratorValue: config.timelockController.quorumNumeratorValue
        };

        const { coraGovernorExpectedAddress } = await getGovernorBytecodeAndExpectedAddress(hre, governorParameters);

        const { governanceInitiationDataDeployerExpectedAddress, governanceInitiationDataDeployerBytecode } = await getGovernanceInitiationDataDeployerBytecodeAndExpectedAddress(hre, governanceInitiationDataBytecode.toString(), coraTokenExpectedAddress, coraTimelockControllerExpectedAddress, coraGovernorExpectedAddress);

        expect(governanceInitiationDataDeployerExpectedAddress).to.equal(GOVERNANCE_INITIATION_DATA_DEPLOYER_EXPECTED_ADDRESS)
    })
});
