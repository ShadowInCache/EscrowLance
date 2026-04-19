require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.24",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
