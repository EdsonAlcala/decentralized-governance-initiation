import { DeploymentConfig } from "./types";

// @dev Arbitrum mainnet config
export const PRODUCTION_CONFIG: DeploymentConfig = {
    deployer: "0xce0042b868300000d44a59004da54a005ffdcf9f",
    salt: "0x00000000000000000000000000000000636f726170726f746f636f6c32303232",
    totalSupply: "100000000000000000000000000", // 100M
    timelockController: {
        minDelay: "600", // 2 hours
        initialSignatures: [],
        initialDelays: [],
        shortDelay: 600,// 7200 blocks per day * 2 hours => (2/24 * 7200)
        defaultDelay: 7200 * 4, // 7200 blocks per day * 4 days 
        longDelay: 7200 * 8, // 7200 blocks per day * 8 days 
        initialVotingDelay: 7200 * 2, // 7200 blocks  * 2 days 
        initialVotingPeriod: 7200 * 3, // 7200 blocks per day * 3 days,
        initialProposalThreshold: "100000000000000000000000", // 100k tokens
        quorumNumeratorValue: 50, // 0.5%  of the total supply (100M) - 500,000 tokens - denominator is 10_000
    },
    axelar: {
        gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
        gasService: "0x2d5d7d31F671F86C782533cc367F14109a082712"
    },
    treasuryBootstrapping: {
        total: "10000000000000000000000000", // 10M
    },
    airdrop: {
        total: "4000000000000000000000000", // 4M
        addresses: {
            "0x23BF95De9F90338F973056351C8Cd2CB78cbe52f": "218afd2a0a419800000"
        }
    },
    vesting: {
        total: "86000000000000000000000000", // 86M
        dao: {
            address: "", // @dev Calculated on deploy since it is the timelock controller
            amount: "54000000000000000000000000", // 55M DAO
            vestingPeriodInMonths: "48",
            vestingCliffInMonths: "0"
        },
        team: {
            address: "0x23BF95De9F90338F973056351C8Cd2CB78cbe52f", // @dev Modify this to the team multisig
            amount: "30000000000000000000000000", // 30M Team
            vestingPeriodInMonths: "48",
            vestingCliffInMonths: "0"
        },
        advisors: [ // 2M for all advisors
            {
                address: "0x23BF95De9F90338F973056351C8Cd2CB78cbe52f",
                amount: "500000000000000000000000", // J
                vestingPeriodInMonths: "24",
                vestingCliffInMonths: "0"
            }
            // @dev Add more advisors here 
        ]
    }
}