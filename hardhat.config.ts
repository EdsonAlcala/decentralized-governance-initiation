import dotenv from "dotenv";

dotenv.config();

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-foundry";
import "hardhat-deploy";

import "./tasks/generateGovernanceInitiation";
import "./tasks/verifyAllCoraContracts";

const DEFAULT_MNEMONIC =
  "test test test test test test test test test test test test";

const INFURA_KEY = process.env.INFURA_KEY;

if (!INFURA_KEY) {
  console.warn("INFURA_KEY not specified");
}

const MAINNET_MNEMONIC = process.env.MAINNET_MNEMONIC;

if (!MAINNET_MNEMONIC) {
  console.warn("MAINNET_MNEMONIC not specified");
}

const LOCAL_MNEMONIC = process.env.LOCAL_MNEMONIC;

if (!LOCAL_MNEMONIC) {
  console.warn("LOCAL_MNEMONIC not specified, using DEFAULT_MNEMONIC");
}

const ARBITRUM_TESTNET_MNEMONIC = process.env.ARBITRUM_TESTNET_MNEMONIC;

if (!ARBITRUM_TESTNET_MNEMONIC) {
  console.warn("ARBITRUM_TESTNET_MNEMONIC not specified");
}

const ARBITRUM_MAINNET_MNEMONIC = process.env.ARBITRUM_MAINNET_MNEMONIC;

if (!ARBITRUM_MAINNET_MNEMONIC) {
  console.warn("ARBITRUM_MAINNET_MNEMONIC not specified");
}

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

if (!ETHERSCAN_API_KEY) {
  console.warn("Etherscan API not specified");
}

console.log("ETHERSCAN_API_KEY", ETHERSCAN_API_KEY)

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,
    recipient: 1,
  },
  etherscan: {
    apiKey: {
      arbitrumOne: ETHERSCAN_API_KEY ?? "",
    }
  },
  networks: {
    hardhat: {
      chainId: 1337,
      accounts: {
        mnemonic: process.env.LOCAL_MNEMONIC || DEFAULT_MNEMONIC,
        initialIndex: 0,
        count: 20,
      },
      forking: {
        url: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_KEY || ""}`,
        enabled: process.env.FORKING === "true",
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: process.env.LOCAL_MNEMONIC || DEFAULT_MNEMONIC,
        initialIndex: 0,
        count: 20,
      }
    },
    arbitrum_testnet: {
      url: `https://arbitrum-goerli.infura.io/v3/${process.env.INFURA_KEY || ""}`,
      accounts: {
        mnemonic: process.env.ARBITRUM_TESTNET_MNEMONIC || "",
      }
    },
    arbitrumOne: {
      url: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_KEY || ""}`,
      accounts: {
        mnemonic: process.env.ARBITRUM_MAINNET_MNEMONIC || "",
      },
      chainId: 42161,
    },
  },
  mocha: {
    timeout: 20000000,
  },
};

export default config;