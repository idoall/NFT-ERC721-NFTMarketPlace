require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const REPORT_GAS = process.env.REPORT_GAS || false;

const ETHMAINNET_URL =
  process.env.ETHMAINNET_URL ||
  "https://eth-mainnet.alchemyapi.io/v2/your-api-key";
const RINKEBY_RPC_URL =
  process.env.RINKEBY_RPC_URL ||
  "https://eth-rinkeby.alchemyapi.io/v2/your-api-key";

const ETHSCAN_API_KEY = process.env.ETHSCAN_API_KEY || "Your etherscan API key";
const PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY || "0x";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  // solidity: "0.8.4",
  solidity: {
    compilers: [
      {
        version: "0.8.14",
      },
    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      //https://hardhat.org/metamask-issue.html#metamask-chainid-issue
      chainId: 1337,
      // accounts: PRIVATE_KEY_TEST !== undefined ? [PRIVATE_KEY_TEST] : [],
      // forking:{
      //   url:alchemyurl,
      //   blockNumber:4043801
      // }
    },
    localhost: {
      chainId: 1337,
      gas: 5500000,
      // accounts: PRIVATE_KEY_TEST !== undefined ? [PRIVATE_KEY_TEST] : [],
    },
    ethmainnet: {
      url: ETHMAINNET_URL,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      // accounts: {
      //   mnemonic: MNEMONIC,
      // },
      // gas: 5500000,
      saveDeployments: true,
      chainId: 1,
    },
    rinkeby: {
      url: RINKEBY_RPC_URL,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      // accounts: {
      //   mnemonic: MNEMONIC,
      // },
      // gas: 5500000,
      // gas: "auto",
      // gasPrice: "auto",
      saveDeployments: true,
      chainId: 4,
    },


  },
  etherscan: {
    // npx hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
    apiKey: {
      mainnet: ETHSCAN_API_KEY,
      rinkeby: ETHSCAN_API_KEY,
    },
  },
  gasReporter: {
    enabled: REPORT_GAS,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  contractSizer: {
    runOnCompile: false,
    only: ["Raffle"],
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
      1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
    },
    player: {
      default: 1,
    },
  },
  mocha: {
    timeout: 200000, // 200 seconds max for running tests
  },
};
