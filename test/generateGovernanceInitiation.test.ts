import { expect } from 'chai';
import hre, { run, ethers } from 'hardhat';
import { GovernanceInitiationDataGeneration } from '../tasks/generateGovernanceInitiation';

import OUTPUT_FILE_FULL from "../tasks/deploymentActions_full.json";
import { AIRDROP_EXPECTED_ADDRESS, CORA_TOKEN_EXPECTED_ADDRESS, DEPLOYER_ADDRESS, GOVERNANCE_INITIATION_DATA_DEPLOYER_EXPECTED_ADDRESS, GOVERNANCE_INITIATION_EXPECTED_ADDRESS, GOVERNOR_EXPECTED_ADDRESS, MESSAGE_RELAYER_EXPECTED_ADDRESS, TIMELOCK_CONTROLLED_EXPECTED_ADDRESS, TREASURY_BOOTSTRAPPING_EXPECTED_ADDRESS, VESTING_FOR_ADVISORS_EXPECTED_ADDRESS, VESTING_FOR_DAO_EXPECTED_ADDRESS, VESTING_FOR_DEVELOPMENT_TEAM_EXPECTED_ADDRESS } from '../constants';
import { getDeploymentConfig } from '../src/utils';

// @dev Be aware this test suite runs using FORKING=true for arbitrum and --network hardhat (see package.json)
describe('Task generateGovernanceInitiation', () => {
    let dataGenerated: GovernanceInitiationDataGeneration
    before(async () => {
        dataGenerated = await run('generateGovernanceInitiation');

        await delay(4000)
    });

    it('generates the governance initiation data correctly', async () => {
        // Make assertions to verify the expected behavior
        expect(dataGenerated).to.not.be.undefined;
        expect(dataGenerated).to.not.be.null;

        expect(dataGenerated.governanceInitiationDataExpectedAddress).to.equal(GOVERNANCE_INITIATION_EXPECTED_ADDRESS)

        expect(dataGenerated.treasuryBootstrappingExpectedAddress).to.equal(TREASURY_BOOTSTRAPPING_EXPECTED_ADDRESS)

        expect(dataGenerated.vestingForDevelopmentTeamExpectedAddress).to.equal(VESTING_FOR_DEVELOPMENT_TEAM_EXPECTED_ADDRESS)

        expect(dataGenerated.timelockControlledExpectedAddress).to.equal(TIMELOCK_CONTROLLED_EXPECTED_ADDRESS)

        expect(dataGenerated.messageRelayerExpectedAddress).to.equal(MESSAGE_RELAYER_EXPECTED_ADDRESS)


        expect(dataGenerated.vestingForDAOExpectedAddress).to.equal(VESTING_FOR_DAO_EXPECTED_ADDRESS)

        expect(dataGenerated.vestingForAdvisorsExpectedAddress[0]).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[0])
        expect(dataGenerated.vestingForAdvisorsExpectedAddress[1]).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[1])
        expect(dataGenerated.vestingForAdvisorsExpectedAddress[2]).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[2])
        expect(dataGenerated.vestingForAdvisorsExpectedAddress[3]).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[3])
        expect(dataGenerated.vestingForAdvisorsExpectedAddress[4]).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[4])

        expect(dataGenerated.advisorsRecipients[0].address).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[0]) // @dev check local.ts config
        expect(dataGenerated.advisorsRecipients[1].address).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[1]) // @dev check local.ts config
        expect(dataGenerated.vestingForAdvisorsExpectedAddress.length).to.equal(5)

        expect(dataGenerated.airdropExpectedAddress).to.equal(AIRDROP_EXPECTED_ADDRESS)

        expect(dataGenerated.coraTokenExpectedAddress).to.equal(CORA_TOKEN_EXPECTED_ADDRESS)

        expect(dataGenerated.governorExpectedAddress).to.equal(GOVERNOR_EXPECTED_ADDRESS)

    });

    it('generates the file correctly', async () => {
        // deployer
        // @dev Keep in mind contract already exists in the forked network
        expect(OUTPUT_FILE_FULL.actions[0].expectedAddress).to.equal(DEPLOYER_ADDRESS)
        expect(OUTPUT_FILE_FULL.actions[0].domain).to.equal("deployer.contract.coraprotocol.eth")
        expect(OUTPUT_FILE_FULL.actions[0].contract).to.equal("Deployer.sol")

        // governance initiation data deployer
        expect(OUTPUT_FILE_FULL.actions[1].expectedAddress).to.equal(GOVERNANCE_INITIATION_DATA_DEPLOYER_EXPECTED_ADDRESS)
        expect(OUTPUT_FILE_FULL.actions[1].domain).to.equal("data.contract.coraprotocol.eth")
        expect(OUTPUT_FILE_FULL.actions[1].contract).to.equal("GovernanceInitiationData.sol")

        // cora token
        expect(OUTPUT_FILE_FULL.actions[2].expectedAddress).to.equal(CORA_TOKEN_EXPECTED_ADDRESS)
        expect(OUTPUT_FILE_FULL.actions[2].domain).to.equal("coratoken.contract.coraprotocol.eth")
        expect(OUTPUT_FILE_FULL.actions[2].contract).to.equal("CoraToken.sol")

        // cora time lock
        expect(OUTPUT_FILE_FULL.actions[3].expectedAddress).to.equal(TIMELOCK_CONTROLLED_EXPECTED_ADDRESS)
        expect(OUTPUT_FILE_FULL.actions[3].domain).to.equal("timelock.contract.coraprotocol.eth")
        expect(OUTPUT_FILE_FULL.actions[3].contract).to.equal("CoraTimelockController.sol")

        // message relayer
        expect(OUTPUT_FILE_FULL.actions[4].expectedAddress).to.equal(MESSAGE_RELAYER_EXPECTED_ADDRESS)
        expect(OUTPUT_FILE_FULL.actions[4].domain).to.equal("relayer.contract.coraprotocol.eth")
        expect(OUTPUT_FILE_FULL.actions[4].contract).to.equal("MessageRelayer.sol")

        // cora governor
        expect(OUTPUT_FILE_FULL.actions[5].expectedAddress).to.equal(GOVERNOR_EXPECTED_ADDRESS)
        expect(OUTPUT_FILE_FULL.actions[5].domain).to.equal("governor.contract.coraprotocol.eth")
        expect(OUTPUT_FILE_FULL.actions[5].contract).to.equal("CoraGovernor.sol")

        // treasury bootstrapping
        expect(OUTPUT_FILE_FULL.actions[6].expectedAddress).to.equal(TREASURY_BOOTSTRAPPING_EXPECTED_ADDRESS)
        expect(OUTPUT_FILE_FULL.actions[6].domain).to.equal("treasury.contract.coraprotocol.eth")
        expect(OUTPUT_FILE_FULL.actions[6].contract).to.equal("TreasuryBoostrapping.sol")

        // vesting for team
        expect(OUTPUT_FILE_FULL.actions[7].expectedAddress).to.equal(VESTING_FOR_DEVELOPMENT_TEAM_EXPECTED_ADDRESS)
        expect(OUTPUT_FILE_FULL.actions[7].domain).to.equal("team.vesting.contract.coraprotocol.eth")
        expect(OUTPUT_FILE_FULL.actions[7].contract).to.equal("Vesting.sol")

        // vesting for dao
        expect(OUTPUT_FILE_FULL.actions[8].expectedAddress).to.equal(VESTING_FOR_DAO_EXPECTED_ADDRESS)
        expect(OUTPUT_FILE_FULL.actions[8].domain).to.equal("dao.vesting.contract.coraprotocol.eth")
        expect(OUTPUT_FILE_FULL.actions[8].contract).to.equal("Vesting.sol")

        // vesting for advisors
        expect(OUTPUT_FILE_FULL.actions[9].expectedAddress).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[0])
        expect(OUTPUT_FILE_FULL.actions[9].domain).to.equal("advisor-0.vesting.contract.coraprotocol.eth")
        expect(OUTPUT_FILE_FULL.actions[9].contract).to.equal("Vesting.sol")

        expect(OUTPUT_FILE_FULL.actions[10].expectedAddress).to.equal(VESTING_FOR_ADVISORS_EXPECTED_ADDRESS[1])
        expect(OUTPUT_FILE_FULL.actions[10].domain).to.equal("advisor-1.vesting.contract.coraprotocol.eth")
        expect(OUTPUT_FILE_FULL.actions[10].contract).to.equal("Vesting.sol")

        // airdrop
        expect(OUTPUT_FILE_FULL.actions[14].expectedAddress).to.equal(AIRDROP_EXPECTED_ADDRESS)
        expect(OUTPUT_FILE_FULL.actions[14].domain).to.equal("airdrop.contract.coraprotocol.eth")
        expect(OUTPUT_FILE_FULL.actions[14].contract).to.equal("MerkleDistributorWithDeadline.sol")
    });

    it('deploys the governance initiation data correctly', async () => {
        // deploy governance initiation data using the governance initiation data deployer bytecode
        const config = await getDeploymentConfig(hre)
        const deployerInstance = await ethers.getContractAt("IDeployer", DEPLOYER_ADDRESS)

        const governanceInitiationDataTx = await deployerInstance.deploy(OUTPUT_FILE_FULL.actions[1].bytecode, config.salt, {
            gasLimit: 30000000
        })
        await governanceInitiationDataTx.wait()

        // deploy Cora token
        const coraTokenTx = await deployerInstance.deploy(OUTPUT_FILE_FULL.actions[2].bytecode, config.salt)
        await coraTokenTx.wait()

        // Deploy Cora Timelock Controller
        const timelockControllerTx = await deployerInstance.deploy(OUTPUT_FILE_FULL.actions[3].bytecode, config.salt)
        await timelockControllerTx.wait()

        // Deploy MessageRelayer
        const messageRelayerTx = await deployerInstance.deploy(OUTPUT_FILE_FULL.actions[4].bytecode, config.salt)
        await messageRelayerTx.wait()

        // Deploy CoraGovernor
        const coraGovernorTx = await deployerInstance.deploy(OUTPUT_FILE_FULL.actions[5].bytecode, config.salt, {
            gasLimit: 30000000
        })
        await coraGovernorTx.wait()

        // Deploy Treasury bootstrapping
        const treasuryBootstrappingTx = await deployerInstance.deploy(OUTPUT_FILE_FULL.actions[6].bytecode, config.salt)
        await treasuryBootstrappingTx.wait()

        // Deploy Vesting for the team
        const vestingForTeamTx = await deployerInstance.deploy(OUTPUT_FILE_FULL.actions[7].bytecode, config.salt)
        await vestingForTeamTx.wait()

        // Deploy Vesting for DAO
        const vestingForDaoTx = await deployerInstance.deploy(OUTPUT_FILE_FULL.actions[8].bytecode, config.salt)
        await vestingForDaoTx.wait()

        // Deploy Vesting for Advisors
        const vestingForAdvisor1Tx = await deployerInstance.deploy(OUTPUT_FILE_FULL.actions[9].bytecode, config.salt)
        await vestingForAdvisor1Tx.wait()

        const vestingForAdvisor2Tx = await deployerInstance.deploy(OUTPUT_FILE_FULL.actions[10].bytecode, config.salt)
        await vestingForAdvisor2Tx.wait()

        // Deploy AirDrop Contract
        const airdropTx = await deployerInstance.deploy(OUTPUT_FILE_FULL.actions[11].bytecode, config.salt)
        await airdropTx.wait()
    });
});

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
