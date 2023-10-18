import chalk from 'chalk'
import path from "path";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { task } from 'hardhat/config';
import ACTIONS from './deploymentActions_full.json'
import { PRODUCTION_CONFIG } from '../config/production';
import { parseBalanceMap } from '../src/parse-balance-map';

task('verifyCoraContracts', 'Verify all the Cora contracts')
    .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {

        // Governance Initiation Data Deployer
        // await hre.run("verify:verify", {
        //     address: "0x19cf7aC77614f5256D785C0C0c13F1e7460b32b2",
        //     constructorArguments: [
        //         "0x60806040526003805460ff1916905534801561001a57600080fd5b50436004556101e98061002e6000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c80631e32144714610051578063276f1c41146100665780634bc66f321461008f5780639d76ea58146100a0575b600080fd5b61006461005f366004610116565b6100b1565b005b6002546001600160a01b03165b6040516001600160a01b03909116815260200160405180910390f35b6001546001600160a01b0316610073565b6000546001600160a01b0316610073565b60035460ff16156100d557604051635056541b60e11b815260040160405180910390fd5b60045443146100f75760405163c2c7b8af60e01b815260040160405180910390fd5b806000610104828261016d565b50506003805460ff1916600117905550565b60006060828403121561012857600080fd5b50919050565b600081356001600160a01b038116811461014757600080fd5b92915050565b80546001600160a01b0319166001600160a01b0392909216919091179055565b61017f6101798361012e565b8261014d565b61019761018e6020840161012e565b6001830161014d565b6101af6101a66040840161012e565b6002830161014d565b505056fea2646970667358221220c2ec2d793630158fc52a3414abd7dcd7c14b3871a8c2793d2814fc1c81509bdb64736f6c63430008130033",
        //         "0x00000000000000000000000000000000636f726170726f746f636f6c32303232",
        //         {
        //             tokenAddress: "0x41f89104D82BF3Cc560AD0241601d38fF05AC0aD",
        //             timelockAddress: "0xCebD5817EeD45e50a2D8341AB4Fe443E4d701d72",
        //             governorAddress: "0xE926F8c54b1401600D6A40aBb598b762f4904b6e",
        //         }
        //     ],
        // });

        const GOVERNANCE_INITIATION_ADDRESS = "0x290f70bcF87F4053df44B113aE01aea74bacd353"
        // Governance Initiation Data
        await hre.run("verify:verify", {
            address: GOVERNANCE_INITIATION_ADDRESS,
            constructorArguments: [],
        });

        // Cora Token
        await hre.run("verify:verify", {
            address: ACTIONS.actions[2].expectedAddress,
            constructorArguments: [
                GOVERNANCE_INITIATION_ADDRESS,
                [
                    {
                        to: '0xcCE17361A9E7632f6f601361f98a5AC143B6ADc3',
                        amount: '10000000000000000000000000'
                    },
                    {
                        to: '0xD0c0334b035621905E4AACDebC4F35B004A2AadB',
                        amount: '30000000000000000000000000'
                    },
                    {
                        to: '0x35325809Bdef8ce06372981bb6d2497a279723b0',
                        amount: '54000000000000000000000000'
                    },
                    {
                        to: '0xd469BCDba61342e651988C75Ea9AdabaCf29cb10',
                        amount: '500000000000000000000000'
                    },
                    {
                        to: '0x6146f6Ae9cf4C58df1D880c1B54148BC3bafd068',
                        amount: '500000000000000000000000'
                    },
                    {
                        to: '0x2f7F4f7474A3b57990d911df83C9d2D33F67C361',
                        amount: '500000000000000000000000'
                    },
                    {
                        to: '0x06EB497aCB61D19bfcECaa123300679dBc33A13E',
                        amount: '250000000000000000000000'
                    },
                    {
                        to: '0xF92FD06DA697CD46DCfE002a8eA15b756B9C9961',
                        amount: '250000000000000000000000'
                    },
                    {
                        to: '0x50Db5af36F3B907E028FAD8BA1ba5e235F131B62',
                        amount: '4000000000000000000000000'
                    }
                ]
            ],
        });

        // Cora Timelock
        await hre.run("verify:verify", {
            contract: "contracts/governance/CoraTimelockController.sol:CoraTimelockController",
            address: ACTIONS.actions[3].expectedAddress,
            constructorArguments: [
                PRODUCTION_CONFIG.timelockController.minDelay,
                [],
                [],
                GOVERNANCE_INITIATION_ADDRESS
            ]
        })

        // MessageRelayer
        await hre.run("verify:verify", {
            address: ACTIONS.actions[4].expectedAddress,
            constructorArguments: [
                PRODUCTION_CONFIG.axelar.gateway,
                PRODUCTION_CONFIG.axelar.gasService,
                ACTIONS.actions[3].expectedAddress // Owner is the timelock or DAO
            ]
        })

        // CoraGovernor
        await hre.run("verify:verify", {
            address: ACTIONS.actions[5].expectedAddress,
            constructorArguments: [
                {
                    token: ACTIONS.actions[2].expectedAddress, // token address
                    timelock: ACTIONS.actions[3].expectedAddress, // Owner is the timelock or DAO
                    messageRelayer: ACTIONS.actions[4].expectedAddress, // message relayer
                    functionSignatures: [],
                    functionsDelays: [],
                    shortDelay: PRODUCTION_CONFIG.timelockController.shortDelay,
                    defaultDelay: PRODUCTION_CONFIG.timelockController.defaultDelay,
                    longDelay: PRODUCTION_CONFIG.timelockController.longDelay,
                    initialVotingDelay: PRODUCTION_CONFIG.timelockController.initialVotingDelay,
                    initialVotingPeriod: PRODUCTION_CONFIG.timelockController.initialVotingPeriod,
                    initialProposalThreshold: PRODUCTION_CONFIG.timelockController.initialProposalThreshold,
                    quorumNumeratorValue: PRODUCTION_CONFIG.timelockController.quorumNumeratorValue,
                }
            ]
        })

        // TreasuryBoostrapping
        await hre.run("verify:verify", {
            address: ACTIONS.actions[6].expectedAddress,
            constructorArguments: [
                GOVERNANCE_INITIATION_ADDRESS
            ]
        })

        console.log("Treasury bootstrapping Verified")

        // Team Vesting
        await hre.run("verify:verify", {
            address: ACTIONS.actions[7].expectedAddress,
            constructorArguments: [
                GOVERNANCE_INITIATION_ADDRESS,
                PRODUCTION_CONFIG.vesting.team.address,
                0,
                0,
                48
            ]
        })

        console.log("Team vesting Verified")

        // DAO Vesting
        await hre.run("verify:verify", {
            address: ACTIONS.actions[8].expectedAddress,
            constructorArguments: [
                GOVERNANCE_INITIATION_ADDRESS,
                ACTIONS.actions[3].expectedAddress, // Owner is the timelock or DAO
                0,
                0,
                48
            ]
        })

        console.log("DAO vesting Verified")

        // advisor-0 Vesting
        await hre.run("verify:verify", {
            address: ACTIONS.actions[9].expectedAddress,
            constructorArguments: [
                GOVERNANCE_INITIATION_ADDRESS,
                PRODUCTION_CONFIG.vesting.advisors[0].address,
                0,
                0,
                24
            ]
        })

        console.log("Advisor-0 vesting Verified")

        // advisor-1 Vesting
        await hre.run("verify:verify", {
            address: ACTIONS.actions[10].expectedAddress,
            constructorArguments: [
                GOVERNANCE_INITIATION_ADDRESS,
                PRODUCTION_CONFIG.vesting.advisors[1].address,
                0,
                0,
                24
            ]
        })

        console.log("Advisor-1 vesting Verified")

        // advisor-2 Vesting
        await hre.run("verify:verify", {
            address: ACTIONS.actions[11].expectedAddress,
            constructorArguments: [
                GOVERNANCE_INITIATION_ADDRESS,
                PRODUCTION_CONFIG.vesting.advisors[2].address,
                0,
                0,
                24
            ]
        })

        console.log("Advisor-2 vesting Verified")

        // advisor-3 Vesting
        await hre.run("verify:verify", {
            address: ACTIONS.actions[12].expectedAddress,
            constructorArguments: [
                GOVERNANCE_INITIATION_ADDRESS,
                PRODUCTION_CONFIG.vesting.advisors[3].address,
                0,
                0,
                24
            ]
        })

        console.log("Advisor-3 vesting Verified")

        // advisor-4 Vesting
        await hre.run("verify:verify", {
            address: ACTIONS.actions[13].expectedAddress,
            constructorArguments: [
                GOVERNANCE_INITIATION_ADDRESS,
                PRODUCTION_CONFIG.vesting.advisors[4].address,
                0,
                0,
                24
            ]
        })

        console.log("Advisor-4 vesting Verified")

        const { merkleRoot } = parseBalanceMap(PRODUCTION_CONFIG.airdrop.addresses)
        // airdrop Vesting
        await hre.run("verify:verify", {
            address: ACTIONS.actions[14].expectedAddress,
            constructorArguments: [
                GOVERNANCE_INITIATION_ADDRESS,
                merkleRoot
            ]
        })

        console.log("Airdrop vesting Verified")
    })