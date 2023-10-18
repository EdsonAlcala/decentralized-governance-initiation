import { expect } from "chai";
import hre, { ethers, run } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { setBalance, impersonateAccount, time, mine } from "@nomicfoundation/hardhat-network-helpers";

import { GovernanceInitiationDataGeneration } from "../tasks/generateGovernanceInitiation";
import { MerkleDistributorWithDeadline__factory } from "../typechain-types";
import OUTPUT_FILE_FULL from "../tasks/deploymentActions_full.json";

import { PRODUCTION_CONFIG } from "../config/production";
import { getDeploymentConfig } from "../src/utils";
import { DEPLOYER_ADDRESS } from "../constants";
import { parseBalanceMap } from "../src/parse-balance-map";
import { BigNumber } from "ethers";
import { parseBalanceMapModified } from "../src/parse-balance-map-modified";

describe("E2E", () => {
    let dataGenerated: GovernanceInitiationDataGeneration
    let deployer: SignerWithAddress;

    before(async () => {
        dataGenerated = await run('generateGovernanceInitiation');
        const signers = await ethers.getSigners();
        deployer = signers[0];

        // deploy governance initiation data using the governance initiation data deployer bytecode
        const config = await getDeploymentConfig(hre)
        const deployerInstance = await ethers.getContractAt("IDeployer", DEPLOYER_ADDRESS, deployer)

        const governanceInitiationDataTx = await deployerInstance.deploy(OUTPUT_FILE_FULL.actions[1].bytecode, config.salt, {
            gasLimit: 30000000
        })
        await governanceInitiationDataTx.wait()

        // deploy Cora token
        await expect(deployerInstance.deploy(OUTPUT_FILE_FULL.actions[2].bytecode, config.salt)).to.emit(deployerInstance, "Deployed").withArgs(deployer.address, dataGenerated.coraTokenExpectedAddress)

        // Deploy Cora Timelock Controller
        await expect(deployerInstance.deploy(OUTPUT_FILE_FULL.actions[3].bytecode, config.salt)).to.emit(deployerInstance, "Deployed").withArgs(deployer.address, dataGenerated.timelockControlledExpectedAddress)

        // Deploy MessageRelayer
        await expect(deployerInstance.deploy(OUTPUT_FILE_FULL.actions[4].bytecode, config.salt)).to.emit(deployerInstance, "Deployed").withArgs(deployer.address, dataGenerated.messageRelayerExpectedAddress)

        // Deploy CoraGovernor
        await expect(deployerInstance.deploy(OUTPUT_FILE_FULL.actions[5].bytecode, config.salt, {
            gasLimit: 30000000
        })).to.emit(deployerInstance, "Deployed").withArgs(deployer.address, dataGenerated.governorExpectedAddress)

        // Deploy Treasury bootstrapping
        await expect(deployerInstance.deploy(OUTPUT_FILE_FULL.actions[6].bytecode, config.salt)).to.emit(deployerInstance, "Deployed").withArgs(deployer.address, dataGenerated.treasuryBootstrappingExpectedAddress)

        // Deploy Vesting for the team
        await expect(deployerInstance.deploy(OUTPUT_FILE_FULL.actions[7].bytecode, config.salt)).to.emit(deployerInstance, "Deployed").withArgs(deployer.address, dataGenerated.vestingForDevelopmentTeamExpectedAddress)

        // Deploy Vesting for DAO
        await expect(deployerInstance.deploy(OUTPUT_FILE_FULL.actions[8].bytecode, config.salt)).to.emit(deployerInstance, "Deployed").withArgs(deployer.address, dataGenerated.vestingForDAOExpectedAddress)

        // Deploy Vesting for Advisors
        await expect(deployerInstance.deploy(OUTPUT_FILE_FULL.actions[9].bytecode, config.salt)).to.emit(deployerInstance, "Deployed").withArgs(deployer.address, dataGenerated.vestingForAdvisorsExpectedAddress[0])

        await expect(deployerInstance.deploy(OUTPUT_FILE_FULL.actions[10].bytecode, config.salt)).to.emit(deployerInstance, "Deployed").withArgs(deployer.address, dataGenerated.vestingForAdvisorsExpectedAddress[1])

        await expect(deployerInstance.deploy(OUTPUT_FILE_FULL.actions[11].bytecode, config.salt)).to.emit(deployerInstance, "Deployed").withArgs(deployer.address, dataGenerated.vestingForAdvisorsExpectedAddress[2])

        await expect(deployerInstance.deploy(OUTPUT_FILE_FULL.actions[12].bytecode, config.salt)).to.emit(deployerInstance, "Deployed").withArgs(deployer.address, dataGenerated.vestingForAdvisorsExpectedAddress[3])

        await expect(deployerInstance.deploy(OUTPUT_FILE_FULL.actions[13].bytecode, config.salt)).to.emit(deployerInstance, "Deployed").withArgs(deployer.address, dataGenerated.vestingForAdvisorsExpectedAddress[4])

        // Deploy AirDrop Contract
        await expect(deployerInstance.deploy(OUTPUT_FILE_FULL.actions[14].bytecode, config.salt)).to.emit(deployerInstance, "Deployed").withArgs(deployer.address, dataGenerated.airdropExpectedAddress)
    })

    it("should deploy the Cora Token", async () => {
        const coraTokenInstance = await ethers.getContractAt("CoraToken", dataGenerated.coraTokenExpectedAddress, deployer)
        const code = await ethers.provider.getCode(dataGenerated.coraTokenExpectedAddress)
        expect(code).to.not.equal("0x")

        const name = await coraTokenInstance.name()
        const symbol = await coraTokenInstance.symbol()
        const decimals = await coraTokenInstance.decimals()
        const totalSupply = await coraTokenInstance.totalSupply()

        expect(name).to.equal("Cora")
        expect(symbol).to.equal("CORA")
        expect(decimals).to.equal(18)
        expect(totalSupply).to.equal(ethers.utils.parseEther("100000000")) // 100M
    })


    it("checks the distribution", async () => {
        const coraTokenInstance = await ethers.getContractAt("CoraToken", dataGenerated.coraTokenExpectedAddress, deployer)

        const treasuryBalance = await coraTokenInstance.balanceOf(dataGenerated.treasuryBootstrappingExpectedAddress)
        const airdropBalance = await coraTokenInstance.balanceOf(dataGenerated.airdropExpectedAddress)
        const daoBalance = await coraTokenInstance.balanceOf(dataGenerated.vestingForDAOExpectedAddress)
        const teamBalance = await coraTokenInstance.balanceOf(dataGenerated.vestingForDevelopmentTeamExpectedAddress)
        const advisor1Balance = await coraTokenInstance.balanceOf(dataGenerated.vestingForAdvisorsExpectedAddress[0])
        const advisor2Balance = await coraTokenInstance.balanceOf(dataGenerated.vestingForAdvisorsExpectedAddress[1])
        const advisor3Balance = await coraTokenInstance.balanceOf(dataGenerated.vestingForAdvisorsExpectedAddress[2])
        const advisor4Balance = await coraTokenInstance.balanceOf(dataGenerated.vestingForAdvisorsExpectedAddress[3])
        const advisor5Balance = await coraTokenInstance.balanceOf(dataGenerated.vestingForAdvisorsExpectedAddress[4])

        expect(treasuryBalance).to.equal(ethers.utils.parseEther("10000000")) // 10M
        expect(airdropBalance).to.equal(ethers.utils.parseEther("4000000")) // 4M
        expect(daoBalance).to.equal(ethers.utils.parseEther("54000000")) // 54M
        expect(teamBalance).to.equal(ethers.utils.parseEther("30000000")) // 30M
        expect(advisor1Balance).to.equal(ethers.utils.parseEther("500000")) // 500k
        expect(advisor2Balance).to.equal(ethers.utils.parseEther("500000")) // 500k
        expect(advisor3Balance).to.equal(ethers.utils.parseEther("500000")) // 500k
        expect(advisor4Balance).to.equal(ethers.utils.parseEther("250000")) // 250K
        expect(advisor5Balance).to.equal(ethers.utils.parseEther("250000")) // 250K

        // @dev check distro
        let totalAmount = BigNumber.from(0);
        const allDistros = Object.keys(PRODUCTION_CONFIG.airdrop.addresses);
        for (let i = 0; i < allDistros.length; i++) {
            const userAddress = allDistros[i];
            const amount = PRODUCTION_CONFIG.airdrop.addresses[userAddress];
            const amountInNumber = BigNumber.from(`0x${amount}`);
            console.log("Amount", ethers.utils.formatEther(amountInNumber.toString()).toString())
            totalAmount = totalAmount.add(amountInNumber);
        }

        const expectedTotal = ethers.utils.parseEther("4000000");

        expect(expectedTotal).to.be.approximately(expectedTotal, ethers.utils.parseEther("1"));
    })

    it("should allow users to claim their tokens, delegate, create a proposal, vote, contribute to treasury bootstrapping and claim vested tokens", async () => {
        const total = PRODUCTION_CONFIG.airdrop.total;
        const { claims, merkleRoot } = parseBalanceMap(PRODUCTION_CONFIG.airdrop.addresses);

        const coraTokenInstance = await ethers.getContractAt("CoraToken", dataGenerated.coraTokenExpectedAddress, deployer)
        const airdropInstance = await ethers.getContractAt("MerkleDistributorWithDeadline", dataGenerated.airdropExpectedAddress, deployer)

        const airdropAmount = await coraTokenInstance.balanceOf(airdropInstance.address)

        expect(airdropAmount).to.equal(total)

        const keysArray = Object.keys(claims);

        // CLAIM TOKENS

        // @dev impersonate the first 40 users
        const amountOfUsersToImpersonate = 80;
        const proposer = keysArray[0]

        for (let i = 1; i < amountOfUsersToImpersonate; i++) {
            const currentAddress = keysArray[i]
            const amountToClaim = claims[currentAddress].amount

            console.log("currentAddress: ", currentAddress);
            console.log("amountToClaim: ", amountToClaim);

            const data = claims[currentAddress];
            const impersonatedWallet = currentAddress;
            await setBalance(
                impersonatedWallet,
                ethers.utils.parseEther("100.0")
            );
            await impersonateAccount(impersonatedWallet);
            const currentSigner = await ethers.getSigner(impersonatedWallet);

            const merkleDistributorWithDeadlineInstance =
                MerkleDistributorWithDeadline__factory.connect(
                    airdropInstance.address,
                    currentSigner
                );

            const proof0 = data.proof;
            const index = data.index;
            const amount = data.amount;
            await expect(
                merkleDistributorWithDeadlineInstance.claim(
                    index,
                    impersonatedWallet,
                    amount,
                    proof0,
                    { gasLimit: 1000000 }
                )
            )
                .to.emit(merkleDistributorWithDeadlineInstance, "Claimed")
                .withArgs(index, impersonatedWallet, amount)

            console.log("user has claimed the airdrop", currentAddress);
        }

        // DELEGATE
        const devTeamAddress = "0x0f1dc44F866B9326426B15A784079ef5b39D341F" // multisig

        const numberOfUsersToDelegate = 20;

        // @dev impersonate the first 20 users and delegate to the proposer, so he can propose
        for (let i = 1; i < numberOfUsersToDelegate; i++) {
            const currentAddress = keysArray[i]
            await impersonateAccount(currentAddress);
            const impersonatedSigner = await ethers.getSigner(currentAddress);

            const coraTokenInstance = await ethers.getContractAt("CoraToken", dataGenerated.coraTokenExpectedAddress, impersonatedSigner)

            const userBalance = await coraTokenInstance.balanceOf(currentAddress)
            console.log("Delegators balance: ", ethers.utils.formatEther(userBalance.toString()).toString())

            // delegate to   the proposer
            await expect(coraTokenInstance.delegate(proposer)).to.emit(coraTokenInstance, "DelegateChanged").withArgs(currentAddress, ethers.constants.AddressZero, proposer)
        }

        let totalVotes = BigNumber.from(0);

        // @dev impersonate the next selected users and delegate to themselves
        for (let i = numberOfUsersToDelegate; i < amountOfUsersToImpersonate; i++) {
            const currentAddress = keysArray[i]
            await impersonateAccount(currentAddress);
            const impersonatedSigner = await ethers.getSigner(currentAddress);

            const coraTokenInstance = await ethers.getContractAt("CoraToken", dataGenerated.coraTokenExpectedAddress, impersonatedSigner)

            const userBalance = await coraTokenInstance.balanceOf(currentAddress)
            console.log("Voters balance: ", ethers.utils.formatEther(userBalance.toString()).toString())

            totalVotes = totalVotes.add(userBalance)

            // delegate to the proposer
            await expect(coraTokenInstance.delegate(currentAddress)).to.emit(coraTokenInstance, "DelegateChanged").withArgs(currentAddress, ethers.constants.AddressZero, currentAddress)
        }

        console.log("Total votes: ", ethers.utils.formatEther(totalVotes.toString()).toString())

        // create cora governor instance
        await impersonateAccount(proposer);
        const impersonatedProposedSigner = await ethers.getSigner(proposer);
        await setBalance(
            impersonatedProposedSigner.address,
            ethers.utils.parseEther("100.0")
        );

        const coraGovernor = await ethers.getContractAt("CoraGovernor", dataGenerated.governorExpectedAddress, impersonatedProposedSigner)

        // create proposal
        const proposalFunction = "approveAndSchedule";
        const proposalDescription = "Approve the Cora Grant and schedule it";
        const proposalTargetContract = dataGenerated.treasuryBootstrappingExpectedAddress;

        const treasuryBootstrappingInstance = await ethers.getContractAt("TreasuryBootstrapping", dataGenerated.treasuryBootstrappingExpectedAddress, deployer)

        const fdv = ethers.utils.parseEther("12000000"); // 12M
        const targetAmount = ethers.utils.parseEther("1200000"); // 1.2M
        const duration = "864000"; // 10 days
        const privatePeriod = "432000"; // 5 days
        const beneficiary = devTeamAddress;
        const minContributionSize = ethers.utils.parseEther("1500"); // 1.5k
        const maxContributionSize = ethers.utils.parseEther("30000"); // 30k
        const startTimeAfterApproval = "432000"; // 5 days, it means it will start in 5 days after approval
        const stablecoinToken = "0x93b346b6BC2548dA6A1E7d98E9a421B42541425b";

        // calculate claims and merkle root for whitelisted members for private period
        const { claims: claimsForTreasury, merkleRoot: merkleRootForTreasury } = parseBalanceMapModified(PRODUCTION_CONFIG.airdrop.addresses);

        const encodedFunctionCall = treasuryBootstrappingInstance.interface.encodeFunctionData(proposalFunction,
            [fdv, targetAmount, duration, privatePeriod, beneficiary, minContributionSize, maxContributionSize, startTimeAfterApproval, stablecoinToken, merkleRootForTreasury]);

        // PROPOSE
        const proposal = await coraGovernor.propose(
            [proposalTargetContract],
            [0],
            [encodedFunctionCall],
            proposalDescription);

        console.log("proposal created ");

        const proposalBlock = await time.latestBlock();
        console.log("proposalBlock: ", proposalBlock.toString());

        const proposeReceipt = await proposal.wait(1);
        console.log("proposal receipt", proposeReceipt);

        const proposalId = proposeReceipt.events![0].args!.proposalId;
        console.log("proposalId: ", proposalId.toString());

        console.log("proposal state: ", (await coraGovernor.state(proposalId)).toString());

        await expect(
            coraGovernor.castVote(proposalId, 1, { gasLimit: 500000 })
        ).to.be.revertedWith("Governor: vote not currently active");
        console.log("not active");

        // Fast forward time to set proposal as active
        let proposalBlockCounter = proposalBlock + PRODUCTION_CONFIG.timelockController.initialVotingDelay + 25;
        console.log("initial voting block : ", proposalBlockCounter);
        await mine(PRODUCTION_CONFIG.timelockController.initialVotingDelay);

        console.log("proposal state: ", (await coraGovernor.state(proposalId)).toString());

        // VOTE

        // @dev The users who delegated to themselves can vote now
        for (let i = numberOfUsersToDelegate; i < amountOfUsersToImpersonate; i++) {
            const currentAddress = keysArray[i]
            await impersonateAccount(currentAddress);
            const impersonatedSignerToVote = await ethers.getSigner(currentAddress);

            const newCoraGovernor = await ethers.getContractAt("CoraGovernor", dataGenerated.governorExpectedAddress, impersonatedSignerToVote)

            await expect(
                newCoraGovernor.castVote(proposalId, 1, { gasLimit: 500000 })
            ).not.to.be.reverted;
        }

        console.log("voting block : ", await time.latestBlock());


        // QUEUE

        proposalBlockCounter = proposalBlockCounter + PRODUCTION_CONFIG.timelockController.initialVotingPeriod;

        // fast forward time
        await mine(proposalBlockCounter);

        const descriptionHash = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(proposalDescription)
        );

        const queueTx = await coraGovernor.queue(
            [proposalTargetContract],
            [0],
            [encodedFunctionCall],
            descriptionHash,
            { gasLimit: 500000 }
        );

        await queueTx.wait(1);

        // EXECUTE

        proposalBlockCounter = proposalBlockCounter + PRODUCTION_CONFIG.timelockController.defaultDelay;
        await mine(proposalBlockCounter);

        await expect(
            coraGovernor.execute(
                [proposalTargetContract],
                [0],
                [encodedFunctionCall],
                descriptionHash,
                { gasLimit: 500000 }
            )
        ).not.to.be.reverted;

        // assert that the treasury bootstrapping is approved
        const treasuryBootstrappingInstanceAfter = await ethers.getContractAt("TreasuryBootstrapping", dataGenerated.treasuryBootstrappingExpectedAddress, deployer)
        expect(await treasuryBootstrappingInstanceAfter.getStatus()).to.equal(1);

        // allow users to boostrap the treasury

        // @dev impersonate big LUSD whale
        const lUSDWhale = "0x10fe29d92741817293aaa1a241050b0dc384a95e";
        await impersonateAccount(lUSDWhale);
        const impersonatedLUSDWhale = await ethers.getSigner(lUSDWhale);
        await setBalance(
            impersonatedLUSDWhale.address,
            ethers.utils.parseEther("100.0")
        );
        const lUSDInstance = await ethers.getContractAt("IERC20", stablecoinToken, impersonatedLUSDWhale);

        console.log("About to start bootstrapping the treasury");

        // @dev Since the treasury bootstrapping will start in 5 days, we need to fast forward time
        await time.increase(Number(startTimeAfterApproval));

        for (let i = 1; i < amountOfUsersToImpersonate; i++) {
            const currentAddress = keysArray[i]
            const amountToUseToBootstrap = ethers.utils.parseEther("2400") // 2.4k LUSD to bootstrap

            // we transfer to the contributor the amount of LUSD to bootstrap
            await lUSDInstance.transfer(currentAddress, amountToUseToBootstrap);

            await impersonateAccount(currentAddress);
            const impersonatedSigner = await ethers.getSigner(currentAddress);
            const coraTokenInstance = await ethers.getContractAt("CoraToken", dataGenerated.coraTokenExpectedAddress, impersonatedSigner)

            // check the balance of the user before the bootstrap
            const balanceBefore = await coraTokenInstance.balanceOf(currentAddress)
            console.log("BalanceBefore: ", ethers.utils.formatEther(balanceBefore.toString()).toString())

            // approve the treasury contract to spend the LUSD 
            const newLUSDInstance = await ethers.getContractAt("IERC20", stablecoinToken, impersonatedSigner);
            await newLUSDInstance.approve(dataGenerated.treasuryBootstrappingExpectedAddress, amountToUseToBootstrap);

            const newTreasuryInstance = await ethers.getContractAt("TreasuryBootstrapping", dataGenerated.treasuryBootstrappingExpectedAddress, impersonatedSigner)

            await newTreasuryInstance.bootstrap(amountToUseToBootstrap, claimsForTreasury[currentAddress].index, claimsForTreasury[currentAddress].proof);

            // check the balance of the user after the bootstrap
            const balanceAfter = await coraTokenInstance.balanceOf(currentAddress)
            console.log("balanceAfter: ", ethers.utils.formatEther(balanceAfter.toString()).toString())

            expect(balanceAfter).to.be.gt(balanceBefore);
        }

        // enable claim vested tokens 
        await time.increase(60 * 60 * 24 * 30 * 48); // 48 months in the future

        // check balance of the dev team before the release
        const newCoraTokenInstance = await ethers.getContractAt("CoraToken", dataGenerated.coraTokenExpectedAddress)
        const balanceBeforeClaim = await newCoraTokenInstance.balanceOf(devTeamAddress)
        console.log("balanceBeforeClaim: ", ethers.utils.formatEther(balanceBeforeClaim.toString()).toString())

        // for development team
        const teamVestingInstance = await ethers.getContractAt("Vesting", dataGenerated.vestingForDevelopmentTeamExpectedAddress, deployer)
        await teamVestingInstance.release();

        // check balance of the dev team after the release
        const balanceAfterClaim = await newCoraTokenInstance.balanceOf(devTeamAddress)
        console.log("balanceAfterClaim: ", ethers.utils.formatEther(balanceAfterClaim.toString()).toString())

        expect(balanceAfterClaim).to.be.gt(balanceBeforeClaim);
        expect(balanceAfterClaim).to.be.equal(ethers.utils.parseEther("30000000"));

        // for the dao
        const daoVestingInstance = await ethers.getContractAt("Vesting", dataGenerated.vestingForDAOExpectedAddress, deployer)
        await daoVestingInstance.release();

        expect(await newCoraTokenInstance.balanceOf(dataGenerated.timelockControlledExpectedAddress)).to.be.equal(ethers.utils.parseEther("54000000"));
    })
})