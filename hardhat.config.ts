import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthers],
  solidity: "0.8.28",
  paths: {
    sources: "./contracts",
  },
  networks: {
    amoy: {
      type: "http",
      url: "https://polygon-amoy-bor-rpc.publicnode.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};

export default config;