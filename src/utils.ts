import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeploymentConfiguration } from "../config";
import { CoraGovernorParams, Recipient } from "../config/types";

export const getNetworkName = (chainId: number): string => {
    switch (chainId) {
        case 1:
            return "mainnet";
        case 4:
            return "rinkeby";
        case 42161:
            return "arbitrum";
        case 1337:
            return "local";
        default:
            return "unknown";
    }
}

export const getDeploymentConfig = async (hre: HardhatRuntimeEnvironment) => {
    const chainId = Number(await hre.getChainId())
    const deploymentConfiguration = new DeploymentConfiguration(chainId);
    return deploymentConfiguration.getDeploymentConfig();
}

export const getGovernanceInitiationDataBytecodeAndExpectedAddress = async (hre: HardhatRuntimeEnvironment) => {
    const config = await getDeploymentConfig(hre)

    const governanceInitiationData = await hre.ethers.getContractFactory(
        "GovernanceInitiationData"
    );

    const governanceInitiationDataBytecode = governanceInitiationData.getDeployTransaction().data;

    if (!governanceInitiationDataBytecode) {
        throw new Error(`governanceInitiationDataBytecode undefined`);
    }

    const governanceInitiationDataExpectedAddress =
        hre.ethers.utils.getCreate2Address(
            config.deployer,
            config.salt,
            hre.ethers.utils.keccak256(governanceInitiationDataBytecode)
        );


    return {
        governanceInitiationDataExpectedAddress,
        governanceInitiationDataBytecode
    };
}

export const getGovernanceInitiationDataDeployerBytecodeAndExpectedAddress = async (hre: HardhatRuntimeEnvironment, governanceInitiationBytecode: string, coraTokenExpectedAddress: string, coraTimelockControllerExpectedAddress: string, coraGovernorExpectedAddress: string) => {
    const config = await getDeploymentConfig(hre)

    const governanceInitiationDataDeployer = await hre.ethers.getContractFactory(
        "GovernanceInitiationDataDeployer"
    );

    const governanceInitiationDataDeployerBytecode =
        governanceInitiationDataDeployer.getDeployTransaction(
            governanceInitiationBytecode,
            config.salt,
            {
                tokenAddress: coraTokenExpectedAddress,
                timelockAddress: coraTimelockControllerExpectedAddress,
                governorAddress: coraGovernorExpectedAddress,
            }
        ).data;

    if (!governanceInitiationDataDeployerBytecode) {
        throw new Error(`governanceInitiationDataDeployerBytecode undefined`);
    }

    const governanceInitiationDataDeployerExpectedAddress =
        hre.ethers.utils.getCreate2Address(
            config.deployer,
            config.salt,
            hre.ethers.utils.keccak256(governanceInitiationDataDeployerBytecode)
        );

    return {
        governanceInitiationDataDeployerExpectedAddress,
        governanceInitiationDataDeployerBytecode
    };
}

export const getTreasuryBootstrappingByteCodeAndExpectedAddress = async (hre: HardhatRuntimeEnvironment, governanceInitiationDataExpectedAddress: string) => {
    const config = await getDeploymentConfig(hre)

    const treasuryBootstrapping = await hre.ethers.getContractFactory("TreasuryBootstrapping");
    const treasuryBootstrappingDeploymentBytecode = treasuryBootstrapping.getDeployTransaction(
        governanceInitiationDataExpectedAddress
    ).data;

    if (!treasuryBootstrappingDeploymentBytecode) {
        throw new Error(`treasuryBootstrappingDeploymentBytecode undefined`);
    }

    const treasuryBootstrappingExpectedAddress = hre.ethers.utils.getCreate2Address(
        config.deployer,
        config.salt,
        hre.ethers.utils.keccak256(treasuryBootstrappingDeploymentBytecode)
    );

    return {
        treasuryBootstrappingExpectedAddress,
        treasuryBootstrappingDeploymentBytecode
    };
}

export const getTeamVestingBytecodeAndExpectedAddress = async (hre: HardhatRuntimeEnvironment, governanceInitiationDataExpectedAddress: string) => {
    const config = await getDeploymentConfig(hre)

    const vestingForTeamFactory = await hre.ethers.getContractFactory("Vesting");
    const vestingForTheTeamBytecode = vestingForTeamFactory.getDeployTransaction(
        governanceInitiationDataExpectedAddress,
        config.vesting.team.address,
        0, // @dev 0 to use the default vesting start date
        config.vesting.team.vestingCliffInMonths,
        config.vesting.team.vestingPeriodInMonths
    ).data;

    if (!vestingForTheTeamBytecode) {
        throw new Error(`vestingForTheTeamBytecode undefined`);
    }

    const vestingForTeamExpectedAddress = hre.ethers.utils.getCreate2Address(
        config.deployer,
        config.salt,
        hre.ethers.utils.keccak256(vestingForTheTeamBytecode)
    );

    return {
        vestingForTeamExpectedAddress,
        vestingForTheTeamBytecode
    };
}

export const getTimelockControllerBytecodeAndExpectedAddress = async (hre: HardhatRuntimeEnvironment, governanceInitiationDataExpectedAddress: string) => {
    const config = await getDeploymentConfig(hre)

    const coraTimelockController = await hre.ethers.getContractFactory(
        "CoraTimelockController"
    );
    const coraTimelockControllerDeploymentBytecode =
        coraTimelockController.getDeployTransaction(
            config.timelockController.minDelay, // 2 days
            [],
            [],
            governanceInitiationDataExpectedAddress
        ).data;

    if (!coraTimelockControllerDeploymentBytecode) {
        throw new Error(`coraTimelockControllerDeploymentBytecode undefined`);
    }

    const coraTimelockControllerExpectedAddress = hre.ethers.utils.getCreate2Address(
        config.deployer,
        config.salt,
        hre.ethers.utils.keccak256(coraTimelockControllerDeploymentBytecode)
    );

    return {
        coraTimelockControllerExpectedAddress,
        coraTimelockControllerDeploymentBytecode
    };
}

export const getMessageRelayerDeploymentBytecodeAndExpectedAddress = async (hre: HardhatRuntimeEnvironment, coraTimelockControllerExpectedAddress: string) => {
    const config = await getDeploymentConfig(hre)
    const messageRelayer = await hre.ethers.getContractFactory("MessageRelayer");

    const messageRelayerDeploymentBytecode = messageRelayer.getDeployTransaction(
        config.axelar.gateway,
        config.axelar.gasService,
        coraTimelockControllerExpectedAddress
    ).data;

    if (!messageRelayerDeploymentBytecode) {
        throw new Error(`messageRelayerDeploymentBytecode undefined`);
    }

    const messageRelayerExpectedAddress = hre.ethers.utils.getCreate2Address(
        config.deployer,
        config.salt,
        hre.ethers.utils.keccak256(messageRelayerDeploymentBytecode)
    );

    return {
        messageRelayerExpectedAddress,
        messageRelayerDeploymentBytecode
    };
}

export const getVestingForDAOBytecodeAndExpectedAddress = async (hre: HardhatRuntimeEnvironment, governanceInitiationDataExpectedAddress: string, coraTimelockControllerExpectedAddress: string) => {
    const config = await getDeploymentConfig(hre)

    const vestingForDAOFactory = await hre.ethers.getContractFactory("Vesting");
    const vestingForDAODeploymentBytecode = vestingForDAOFactory.getDeployTransaction(
        governanceInitiationDataExpectedAddress,
        coraTimelockControllerExpectedAddress, // @dev this is the timelock controller address
        0, // @dev 0 to use the default vesting start date
        config.vesting.dao.vestingCliffInMonths,
        config.vesting.dao.vestingPeriodInMonths
    ).data;

    if (!vestingForDAODeploymentBytecode) {
        throw new Error(`vestingForDAODeploymentBytecode undefined`);
    }

    const vestingForDAOExpectedAddress = hre.ethers.utils.getCreate2Address(
        config.deployer,
        config.salt,
        hre.ethers.utils.keccak256(vestingForDAODeploymentBytecode)
    );

    return {
        vestingForDAOExpectedAddress,
        vestingForDAODeploymentBytecode
    };
}

export const getAdvisorsVestingsBytecodeAndExpectedAddress = async (hre: HardhatRuntimeEnvironment, governanceInitiationDataExpectedAddress: string) => {
    const config = await getDeploymentConfig(hre)

    const advisorsVestingDeploymentBytecode = [];
    const advisorsVestingExpectedAddress = [];
    const advisorsRecipients: Recipient[] = [];
    const advisorsAddressesWithAmount: Recipient[] = [];

    for (let i = 0; i < config.vesting.advisors.length; i++) {
        const vestingForAdvisorsFactory = await hre.ethers.getContractFactory("Vesting");
        const vestingForAdvisorsDeploymentBytecode = vestingForAdvisorsFactory.getDeployTransaction(
            governanceInitiationDataExpectedAddress,
            config.vesting.advisors[i].address,
            0, // @dev 0 to use the default vesting start date
            config.vesting.advisors[i].vestingCliffInMonths,
            config.vesting.advisors[i].vestingPeriodInMonths
        ).data;

        if (!vestingForAdvisorsDeploymentBytecode) {
            throw new Error(`vestingForAdvisorsDeploymentBytecode undefined`);
        }

        const vestingForAdvisorsExpectedAddress = hre.ethers.utils.getCreate2Address(
            config.deployer,
            config.salt,
            hre.ethers.utils.keccak256(vestingForAdvisorsDeploymentBytecode)
        );

        console.log(`Vesting for Advisor ${i} - Expected address = ${vestingForAdvisorsExpectedAddress}`);

        // @dev Used for the Token Deployment
        advisorsRecipients.push({
            address: vestingForAdvisorsExpectedAddress,
            amount: config.vesting.advisors[i].amount,
        });

        advisorsAddressesWithAmount.push({
            address: config.vesting.advisors[i].address,
            amount: config.vesting.advisors[i].amount,
        });

        advisorsVestingDeploymentBytecode.push(vestingForAdvisorsDeploymentBytecode);
        advisorsVestingExpectedAddress.push(vestingForAdvisorsExpectedAddress);
    }

    return {
        advisorsVestingExpectedAddress,
        advisorsVestingDeploymentBytecode,
        advisorsRecipients,
        advisorsAddressesWithAmount
    }
}

export const getAirdropBytecodeAndExpectedAddress = async (hre: HardhatRuntimeEnvironment, governanceInitiationDataExpectedAddress: string, merkleRoot: string) => {
    const config = await getDeploymentConfig(hre)

    const airdropFactory = await hre.ethers.getContractFactory("MerkleDistributorWithDeadline");
    const airdropDeploymentBytecode = airdropFactory.getDeployTransaction(
        governanceInitiationDataExpectedAddress,
        merkleRoot
    ).data;

    if (!airdropDeploymentBytecode) {
        throw new Error(`airdropDeploymentBytecode undefined`);
    }

    const airdropExpectedAddress = hre.ethers.utils.getCreate2Address(
        config.deployer,
        config.salt,
        hre.ethers.utils.keccak256(airdropDeploymentBytecode)
    );

    return {
        airdropExpectedAddress,
        airdropDeploymentBytecode
    }

}

export const getCoraTokenBytecodeAndExpectedAddress = async (hre: HardhatRuntimeEnvironment, governanceInitiationDataExpectedAddress: string, recipients: Recipient[]) => {
    const config = await getDeploymentConfig(hre)

    const coraToken = await hre.ethers.getContractFactory("CoraToken");
    const coraTokenDeploymentBytecode = coraToken.getDeployTransaction(
        governanceInitiationDataExpectedAddress,
        recipients.map(r => {
            return {
                to: r.address,
                amount: r.amount,
            }
        }),
    ).data;

    if (!coraTokenDeploymentBytecode) {
        throw new Error(`coraTokenDeploymentBytecode undefined`);
    }

    const coraTokenExpectedAddress = hre.ethers.utils.getCreate2Address(
        config.deployer,
        config.salt,
        hre.ethers.utils.keccak256(coraTokenDeploymentBytecode)
    );

    return {
        coraTokenExpectedAddress,
        coraTokenDeploymentBytecode
    };

}

export const getGovernorBytecodeAndExpectedAddress = async (hre: HardhatRuntimeEnvironment, governorParameters: CoraGovernorParams) => {
    const config = await getDeploymentConfig(hre)

    const coraGovernor = await hre.ethers.getContractFactory("CoraGovernor");

    const coraGovernorDeploymentBytecode = coraGovernor.getDeployTransaction(governorParameters).data;

    if (!coraGovernorDeploymentBytecode) {
        throw new Error(`coraGovernorDeploymentBytecode undefined`);
    }

    const coraGovernorExpectedAddress = hre.ethers.utils.getCreate2Address(
        config.deployer,
        config.salt,
        hre.ethers.utils.keccak256(coraGovernorDeploymentBytecode)
    );

    return {
        coraGovernorExpectedAddress,
        coraGovernorDeploymentBytecode
    };
}