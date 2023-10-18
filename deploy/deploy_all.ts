import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { writeFileSync } from "fs";
import path from "path";

import { CoraGovernorParams, Recipient } from "../config/types";
import { parseBalanceMap } from "../src/parse-balance-map";

import { getDeploymentConfig, getGovernorBytecodeAndExpectedAddress, getMessageRelayerDeploymentBytecodeAndExpectedAddress, getNetworkName, getTimelockControllerBytecodeAndExpectedAddress, getTreasuryBootstrappingByteCodeAndExpectedAddress, getVestingForDAOBytecodeAndExpectedAddress } from "../src/utils";
import { getGovernanceInitiationDataBytecodeAndExpectedAddress, getAdvisorsVestingsBytecodeAndExpectedAddress, getAirdropBytecodeAndExpectedAddress, getCoraTokenBytecodeAndExpectedAddress, getTeamVestingBytecodeAndExpectedAddress } from '../src/utils'
import { ethers } from "ethers";


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const chainId = Number(await hre.getChainId());
  const config = await getDeploymentConfig(hre);
  const networkName = getNetworkName(chainId);

  // Token Recipients
  const recipients: Recipient[] = []

  /**
  * ===========================================================
  *
  *          GovernanceInitiationData
  *
  * ===========================================================
  */
  console.log(`Getting GovernanceInitiationData Info`);

  const { governanceInitiationDataExpectedAddress, governanceInitiationDataBytecode } = await getGovernanceInitiationDataBytecodeAndExpectedAddress(hre);
  console.log(`GovernanceInitiationData expected address = ${governanceInitiationDataExpectedAddress}`);

  /**
  * ===========================================================
  *
  *          TreasuryBootstrapping
  *
  * ===========================================================
  */
  console.log(`Getting TreasuryBootstrapping Info`);

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
  *          Development team (Vested)
  *
  * ===========================================================
  */
  console.log(`Getting Vesting for the Team Info`);

  const { vestingForTeamExpectedAddress, vestingForTheTeamBytecode } = await getTeamVestingBytecodeAndExpectedAddress(hre, governanceInitiationDataExpectedAddress);
  console.log(`Vesting for team expected address = ${vestingForTeamExpectedAddress}`);

  // Add vestingForTeamExpectedAddress to recipients
  recipients.push({
    address: vestingForTeamExpectedAddress,
    amount: config.vesting.team.amount
  });

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

  /**
  * ===========================================================
  *
  *          Get claims data
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
  /**
  * ===========================================================
  *
  *          Deploy Contracts
  *
  * ===========================================================
  */

  const deployResult = await deploy("GovernanceInitiationDataDeployer", {
    from: deployer,
    log: true,
    args: [governanceInitiationDataBytecode, config.salt, {
      tokenAddress: coraTokenExpectedAddress,
      timelockAddress: coraTimelockControllerExpectedAddress,
      governorAddress: coraGovernorExpectedAddress,
    }],
  });

  // Check if a specific event was emitted
  const eventSignature = 'Deployed(address,address)';
  const eventTopic = ethers.utils.id(eventSignature);

  // Find the event log by matching the topic
  const eventLog = deployResult.receipt?.logs?.find((log) => log.topics[0] === eventTopic);

  if (!eventLog) {
    throw new Error("Deployed event not found");
  }

  const addr = ethers.utils.getAddress(ethers.utils.hexStripZeros(eventLog.topics[2]));

  const createdAddressForGovernanceInitiation = addr;
  console.log("Created address for GovernanceInitiationData", createdAddressForGovernanceInitiation);

  if (createdAddressForGovernanceInitiation !== governanceInitiationDataExpectedAddress) {
    throw new Error(`GovernanceInitiationData address mismatch. Expected ${governanceInitiationDataExpectedAddress} but got ${createdAddressForGovernanceInitiation}`);
  }

  console.log("About to deploy the remaining contracts using the deployer contract")
  console.log("Deployer contract address", config.deployer);
  const deployerContract = await hre.ethers.getContractAt("IDeployer", config.deployer);

  // Deploy CoraToken
  console.log("About to deploy CoraToken")
  const createdAddressForCoraToken = await deployerContract.callStatic.deploy(coraTokenDeploymentBytecode, config.salt);
  console.log("createdAddressForCoraToken", createdAddressForCoraToken)
  const tx2 = await deployerContract.deploy(coraTokenDeploymentBytecode, config.salt);
  await tx2.wait();

  // Validate result
  if (createdAddressForCoraToken !== coraTokenExpectedAddress) {
    throw new Error(`CoraToken address mismatch. Expected ${coraTokenExpectedAddress} but got ${createdAddressForCoraToken}`);
  }

  // Deploy CoraTimelockController
  console.log("About to deploy CoraTimelockController")
  const createdAddressForCoraTimelockController = await deployerContract.callStatic.deploy(coraTimelockControllerDeploymentBytecode, config.salt);
  const tx4 = await deployerContract.deploy(coraTimelockControllerDeploymentBytecode, config.salt);
  await tx4.wait();

  // Validate result
  if (createdAddressForCoraTimelockController !== coraTimelockControllerExpectedAddress) {
    throw new Error(`CoraTimelockController address mismatch. Expected ${coraTimelockControllerExpectedAddress} but got ${createdAddressForCoraTimelockController}`);
  }

  // Deploy MessageRelayer
  console.log("About to deploy MessageRelayer")
  const createdAddressForMessageRelayer = await deployerContract.callStatic.deploy(messageRelayerDeploymentBytecode, config.salt);

  const tx5 = await deployerContract.deploy(messageRelayerDeploymentBytecode, config.salt);
  await tx5.wait();

  // Validate result
  if (createdAddressForMessageRelayer !== messageRelayerExpectedAddress) {
    throw new Error(`MessageRelayer address mismatch. Expected ${messageRelayerExpectedAddress} but got ${createdAddressForMessageRelayer}`);
  }

  // Deploy CoraGovernor
  console.log("About to deploy CoraGovernor")
  const createdAddressForCoraGovernor = await deployerContract.callStatic.deploy(coraGovernorDeploymentBytecode, config.salt);
  const tx3 = await deployerContract.deploy(coraGovernorDeploymentBytecode, config.salt, {
    gasLimit: 5000000
  });
  await tx3.wait();

  // Validate result
  if (createdAddressForCoraGovernor !== coraGovernorExpectedAddress) {
    throw new Error(`CoraGovernor address mismatch. Expected ${coraGovernorExpectedAddress} but got ${createdAddressForCoraGovernor}`);
  }

  // Deploy Treasury bootstrapping
  console.log("About to deploy TreasuryBootstrapping")
  const createdAddressForTreasuryBootstrapping = await deployerContract.callStatic.deploy(treasuryBootstrappingDeploymentBytecode, config.salt);

  const tx6 = await deployerContract.deploy(treasuryBootstrappingDeploymentBytecode, config.salt);
  await tx6.wait();

  // Validate result
  if (createdAddressForTreasuryBootstrapping !== treasuryBootstrappingExpectedAddress) {
    throw new Error(`TreasuryBootstrapping address mismatch. Expected ${treasuryBootstrappingExpectedAddress} but got ${createdAddressForTreasuryBootstrapping}`);
  }

  // Deploy Vesting for the team
  console.log("About to deploy VestingForTheTeam")
  const createdAddressForTeamVesting = await deployerContract.callStatic.deploy(vestingForTheTeamBytecode, config.salt);
  const tx7 = await deployerContract.deploy(vestingForTheTeamBytecode, config.salt);
  await tx7.wait();

  // Validate result
  if (createdAddressForTeamVesting !== vestingForTeamExpectedAddress) {
    throw new Error(`VestingForTheTeam address mismatch. Expected ${vestingForTeamExpectedAddress} but got ${createdAddressForTeamVesting}`);
  }

  // Deploy Vesting for DAO
  console.log("About to deploy VestingForDAO")
  const createdAddressForDAOVesting = await deployerContract.callStatic.deploy(vestingForDAODeploymentBytecode, config.salt);

  const tx8 = await deployerContract.deploy(vestingForDAODeploymentBytecode, config.salt);
  await tx8.wait();

  // Validate result
  if (createdAddressForDAOVesting !== vestingForDAOExpectedAddress) {
    throw new Error(`VestingForDAO address mismatch. Expected ${vestingForDAOExpectedAddress} but got ${createdAddressForDAOVesting}`);
  }

  // Deploy Vesting for Advisors
  console.log("About to deploy VestingForAdvisors")
  for (let i = 0; i < advisorsVestingDeploymentBytecode.length; i++) {
    const createdAddressForAdvisorsVesting = await deployerContract.callStatic.deploy(advisorsVestingDeploymentBytecode[i], config.salt);

    const tx9 = await deployerContract.deploy(advisorsVestingDeploymentBytecode[i], config.salt);
    await tx9.wait();

    // Validate result
    if (createdAddressForAdvisorsVesting !== advisorsVestingExpectedAddress[i]) {
      throw new Error(`VestingForAdvisors address mismatch. Expected ${advisorsVestingExpectedAddress[i]} but got ${createdAddressForAdvisorsVesting}`);
    }
  }

  // Deploy AirDrop Contract
  console.log("About to deploy AirDrop")
  const createdAddressForAirdrop = await deployerContract.callStatic.deploy(airdropDeploymentBytecode, config.salt);

  const tx10 = await deployerContract.deploy(airdropDeploymentBytecode, config.salt);
  await tx10.wait();

  // Validate result
  if (createdAddressForAirdrop !== airdropExpectedAddress) {
    throw new Error(`Airdrop address mismatch. Expected ${airdropExpectedAddress} but got ${createdAddressForAirdrop}`);
  }
};

export default func;

func.tags = ["all"];

