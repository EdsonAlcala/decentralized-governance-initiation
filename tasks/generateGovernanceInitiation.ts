import chalk from 'chalk'
import path from "path";
import { BytesLike } from "ethers";
import { writeFileSync } from 'fs'
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { task } from 'hardhat/config';

import { getAdvisorsVestingsBytecodeAndExpectedAddress, getAirdropBytecodeAndExpectedAddress, getCoraTokenBytecodeAndExpectedAddress, getDeploymentConfig, getGovernanceInitiationDataBytecodeAndExpectedAddress, getGovernanceInitiationDataDeployerBytecodeAndExpectedAddress, getGovernorBytecodeAndExpectedAddress, getMessageRelayerDeploymentBytecodeAndExpectedAddress, getNetworkName, getTeamVestingBytecodeAndExpectedAddress, getTimelockControllerBytecodeAndExpectedAddress, getTreasuryBootstrappingByteCodeAndExpectedAddress, getVestingForDAOBytecodeAndExpectedAddress } from "../src/utils";

import { CoraGovernorParams, Recipient } from "../config/types";
import { parseBalanceMap } from "../src/parse-balance-map";
import TEMPLATE from "./template.json";

export type GovernanceInitiationDataGeneration = {
    governanceInitiationDataBytecode: BytesLike;
    governanceInitiationDataExpectedAddress: string;
    treasuryBootstrappingDeploymentBytecode: BytesLike;
    treasuryBootstrappingExpectedAddress: string;
    vestingForDevelopmentTeamDeploymentBytecode: BytesLike;
    vestingForDevelopmentTeamExpectedAddress: string;
    timelockControllerDeploymentBytecode: BytesLike;
    timelockControlledExpectedAddress: string;
    messageRelayerDeploymentBytecode: BytesLike;
    messageRelayerExpectedAddress: string;
    vestingForDAODeploymentBytecode: BytesLike;
    vestingForDAOExpectedAddress: string;
    vestingForAdvisorsDeploymentBytecode: BytesLike[];
    vestingForAdvisorsExpectedAddress: string[];
    advisorsRecipients: Recipient[];
    airdropDeploymentBytecode: BytesLike;
    airdropExpectedAddress: string;
    coraTokenDeploymentBytecode: BytesLike;
    coraTokenExpectedAddress: string;
    governorDeploymentBytecode: BytesLike
    governorExpectedAddress: string;
}

export const OUTPUT_FILE_FIRST_STEP_PATH = path.join(__dirname, "deploymentActions_first_step.json");
export const OUTPUT_FILE_FULL_PATH = path.join(__dirname, "deploymentActions_full.json");

task('generateGovernanceInitiation', 'Generate the Governance Initiation Data')
    .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {

        console.log(`Starting the Governance Initiation artifact generation`);

        const chainId = Number(await hre.getChainId())
        console.log(`ChainId = ${chainId}`);

        const config = await getDeploymentConfig(hre);
        const networkName = await getNetworkName(chainId);
        console.log(`Network name = ${networkName}`);

        const actions = TEMPLATE.actions;

        // Token Recipients
        const recipients: Recipient[] = []

        const allVestingDomains: string[] = [];
        /**
        * ===========================================================
        *
        *          GovernanceInitiationData
        *
        * ===========================================================
        */
        console.log(`Populating GovernanceInitiationData`);

        const { governanceInitiationDataExpectedAddress, governanceInitiationDataBytecode } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);
        console.log(`GovernanceInitiationData expected address = ${governanceInitiationDataExpectedAddress}`);
        console.log("GovernanceInitiationData bytecode", governanceInitiationDataBytecode.toString())
        /**
        * ===========================================================
        *
        *          Treasury Bootstrapping 10M
        *
        * ===========================================================
        */
        console.log(`Populating TreasuryBootstrapping`);
        const { treasuryBootstrappingDeploymentBytecode, treasuryBootstrappingExpectedAddress } = await getTreasuryBootstrappingByteCodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        console.log(`TreasuryBootstrapping expected address = ${treasuryBootstrappingExpectedAddress}`);

        // Add treasuryBootstrappingExpectedAddress to recipients
        recipients.push({
            address: treasuryBootstrappingExpectedAddress,
            amount: config.treasuryBootstrapping.total
        });

        /**
        * ===========================================================
        *
        *           Development team (Vested)
        *
        * ===========================================================
        */
        console.log(`Preparing vesting contracts`);
        const { vestingForTeamExpectedAddress, vestingForTheTeamBytecode } = await getTeamVestingBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        console.log(`Vesting for team expected address = ${vestingForTeamExpectedAddress}`);

        // Add vestingForTeamExpectedAddress to recipients
        recipients.push({
            address: vestingForTeamExpectedAddress,
            amount: config.vesting.team.amount
        });

        // Prepare template for file (TEAM)
        const teamVestingDomain = "team.vesting.contract.coraprotocol.eth";
        allVestingDomains.push(teamVestingDomain);

        const vestingTemplateStepForTeam = {
            domain: teamVestingDomain,
            contract: "Vesting.sol",
            bytecode: vestingForTheTeamBytecode.toString(),
            expectedAddress: vestingForTeamExpectedAddress,
            title: `Vesting Cora Team`,
            description: `Vesting for Cora team`,
            dependsOn: [
                "timelock.contract.coraprotocol.eth",
                "deployer.contract.coraprotocol.eth",
            ],
        };
        TEMPLATE.actions.push(vestingTemplateStepForTeam);

        /**
         * ===========================================================
         *
         *          Timelock Controller
         *
         * ===========================================================
         */
        console.log(`Getting CoraTimelockController Info`);

        const { coraTimelockControllerDeploymentBytecode, coraTimelockControllerExpectedAddress } = await getTimelockControllerBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
        console.log(`CoraTimelockController expected address = ${coraTimelockControllerExpectedAddress}`);

        // @dev We don't add the address to recipient because it gets the token via vesting contract

        /**
        * ===========================================================
        *
        *          Message relayer
        *
        * ===========================================================
        */
        console.log(`Getting MessageRelayer Info`);

        const { messageRelayerExpectedAddress, messageRelayerDeploymentBytecode } = await getMessageRelayerDeploymentBytecodeAndExpectedAddress(hre, coraTimelockControllerExpectedAddress);
        console.log(`MessageRelayer expected address = ${messageRelayerExpectedAddress}`);

        /**
        * ===========================================================
        *
        *          DAO (Vested)
        *
        * ===========================================================
        */
        console.log(`Getting Vesting for DAO Info`);

        const { vestingForDAODeploymentBytecode, vestingForDAOExpectedAddress } = await getVestingForDAOBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, coraTimelockControllerExpectedAddress);
        console.log(`Vesting for DAO expected address = ${vestingForDAOExpectedAddress}`);

        // Add vestingForDAOExpectedAddress to recipients
        recipients.push({
            address: vestingForDAOExpectedAddress,
            amount: config.vesting.dao.amount,
        });

        // Prepare template for file (DAO)
        const daoVestingDomain = "dao.vesting.contract.coraprotocol.eth";
        allVestingDomains.push(daoVestingDomain);

        const vestingTemplateStepForDAO = {
            domain: daoVestingDomain,
            contract: "Vesting.sol",
            bytecode: vestingForDAODeploymentBytecode.toString(),
            expectedAddress: vestingForDAOExpectedAddress,
            title: `Vesting Cora DAO`,
            description: `Vesting for Cora DAO`,
            dependsOn: [
                "timelock.contract.coraprotocol.eth",
                "deployer.contract.coraprotocol.eth",
            ],
        };
        TEMPLATE.actions.push(vestingTemplateStepForDAO);

        /**
        * ===========================================================
        *
        *          Vesting for Advisors
        *
        * ===========================================================
        */
        console.log(`Getting Vesting for Advisors Info`);

        const { advisorsVestingDeploymentBytecode, advisorsVestingExpectedAddress, advisorsRecipients } = await getAdvisorsVestingsBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);

        // Add advisorsVestingExpectedAddress to recipients
        recipients.push(...advisorsRecipients);

        // Prepare template for file (Advisors)
        for (let advisorRecipientIndex = 0; advisorRecipientIndex < advisorsRecipients.length; advisorRecipientIndex++) {
            const vestingDomainForCurrentAdvisor = `advisor-${advisorRecipientIndex}.vesting.contract.coraprotocol.eth`;
            allVestingDomains.push(vestingDomainForCurrentAdvisor);

            const vestingTemplateForAdvisor = {
                domain: vestingDomainForCurrentAdvisor,
                contract: "Vesting.sol",
                bytecode: advisorsVestingDeploymentBytecode[advisorRecipientIndex].toString(),
                expectedAddress: advisorsVestingExpectedAddress[advisorRecipientIndex],
                title: `Vesting Advisor ${advisorRecipientIndex}`,
                description: `Vesting Advisor ${advisorRecipientIndex}`,
                dependsOn: [
                    "timelock.contract.coraprotocol.eth",
                    "deployer.contract.coraprotocol.eth",
                ],
            };
            TEMPLATE.actions.push(vestingTemplateForAdvisor);
        }


        /**
        * ===========================================================
        *
        *          Get claims data for Airdrop
        *
        * ===========================================================
        */
        console.log(`Getting claims data`);

        const { claims, merkleRoot } = parseBalanceMap(config.airdrop.addresses)
        const claimsData = JSON.stringify(claims, null, 2);
        writeFileSync(path.join('files', `claims-${networkName}.json`), claimsData);

        /**
        * ===========================================================
        *
        *          Allocate to airdrop contract
        *
        * ===========================================================
        */
        console.log("Allocating to airdrop contract");

        const { airdropDeploymentBytecode, airdropExpectedAddress } = await getAirdropBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, merkleRoot);
        console.log(`Airdrop expected address = ${airdropExpectedAddress}`);

        // Add airdropExpectedAddress to recipients
        recipients.push({
            address: airdropExpectedAddress,
            amount: config.airdrop.total,
        });

        const airdropTemplateStep = {
            domain: "airdrop.contract.coraprotocol.eth",
            contract: "MerkleDistributorWithDeadline.sol",
            bytecode: airdropDeploymentBytecode.toString(),
            expectedAddress: airdropExpectedAddress,
            title: `Airdrop`,
            description: `Airdrop for initial supporters`,
            link: "https://gist.github.com/HetmanJones/c9076837c199ee99ce50c050343e181f",
            recipients,
            dependsOn: [...allVestingDomains, "deployer.contract.coraprotocol.eth"],
        };
        TEMPLATE.actions.push(airdropTemplateStep);
        console.log("Recipients", recipients)
        /**
        * ===========================================================
        *
        *          Cora Token
        *
        * ===========================================================
        */
        console.log(`Getting CoraToken Info`);

        const { coraTokenDeploymentBytecode, coraTokenExpectedAddress } = await getCoraTokenBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress, recipients);
        console.log(`Cora Token expected address = ${coraTokenExpectedAddress}`);

        /**
        * ===========================================================
        *
        *          Governor
        *
        * ===========================================================
        */
        console.log(`Getting Governor Info`);

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

        console.log(`Governor expected address = ${coraGovernorExpectedAddress}`);
        /**
        * ===========================================================
        *
        *          GovernanceInitiationDataDeployer (entering data)
        *
        * ===========================================================
        */
        console.log(`Populating GovernanceInitiationDataDeployer`);

        const { governanceInitiationDataDeployerBytecode, governanceInitiationDataDeployerExpectedAddress } = await getGovernanceInitiationDataDeployerBytecodeAndExpectedAddress(hre, governanceInitiationDataBytecode.toString(), coraTokenExpectedAddress, coraTimelockControllerExpectedAddress, coraGovernorExpectedAddress);

        console.log(`GovernanceInitiationDataDeployer expected address = ${governanceInitiationDataDeployerExpectedAddress}`);

        // Prepare values for file for Governance Initiation Data
        actions[1].bytecode = governanceInitiationDataDeployerBytecode.toString();
        actions[1].expectedAddress = governanceInitiationDataDeployerExpectedAddress;

        // Prepare values for Cora Token
        actions[2].bytecode = coraTokenDeploymentBytecode.toString();
        actions[2].expectedAddress = coraTokenExpectedAddress;

        // Prepare values for Cora TimeLock Controller
        actions[3].bytecode = coraTimelockControllerDeploymentBytecode.toString();
        actions[3].expectedAddress = coraTimelockControllerExpectedAddress;

        // Prepare values for file for message relayer
        actions[4].bytecode = messageRelayerDeploymentBytecode.toString();
        actions[4].expectedAddress = messageRelayerExpectedAddress;

        // Prepare values for file for Cora Governor
        actions[5].bytecode = coraGovernorDeploymentBytecode.toString();
        actions[5].expectedAddress = coraGovernorExpectedAddress;

        // Prepare values for file for Treasury Boostrapping
        actions[6].bytecode = treasuryBootstrappingDeploymentBytecode.toString();
        actions[6].expectedAddress = treasuryBootstrappingExpectedAddress;

        /**
         * ===========================================================
         *
         *          Writing the file
         *
         * ===========================================================
         */

        const templateFirstStep = {
            ...TEMPLATE,
            actions: TEMPLATE.actions.slice(0, 2),
        };

        await writeFileSync(
            OUTPUT_FILE_FIRST_STEP_PATH,
            JSON.stringify(templateFirstStep, null, 4)
        );

        await writeFileSync(OUTPUT_FILE_FULL_PATH, JSON.stringify(TEMPLATE, null, 4));

        const result: GovernanceInitiationDataGeneration = {
            governanceInitiationDataBytecode: governanceInitiationDataBytecode,
            governanceInitiationDataExpectedAddress,
            treasuryBootstrappingDeploymentBytecode,
            treasuryBootstrappingExpectedAddress,
            vestingForDevelopmentTeamDeploymentBytecode: vestingForTheTeamBytecode.toString(),
            vestingForDevelopmentTeamExpectedAddress: vestingForTeamExpectedAddress,
            timelockControllerDeploymentBytecode: coraTimelockControllerDeploymentBytecode,
            timelockControlledExpectedAddress: coraTimelockControllerExpectedAddress,
            messageRelayerDeploymentBytecode,
            messageRelayerExpectedAddress,
            vestingForDAODeploymentBytecode: vestingForDAODeploymentBytecode,
            vestingForDAOExpectedAddress: vestingForDAOExpectedAddress,
            vestingForAdvisorsDeploymentBytecode: advisorsVestingDeploymentBytecode,
            vestingForAdvisorsExpectedAddress: advisorsVestingExpectedAddress,
            advisorsRecipients,
            airdropDeploymentBytecode: airdropDeploymentBytecode,
            airdropExpectedAddress: airdropExpectedAddress,
            coraTokenDeploymentBytecode: coraTokenDeploymentBytecode,
            coraTokenExpectedAddress: coraTokenExpectedAddress,
            governorDeploymentBytecode: coraGovernorDeploymentBytecode,
            governorExpectedAddress: coraGovernorExpectedAddress,
        }


        console.log("Task Generate Governance Initiation Completed")

        return result;

    });