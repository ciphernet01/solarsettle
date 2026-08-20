import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  console.log("Deploying SolarSettle contract...");

  const SolarSettle = await ethers.getContractFactory("SolarSettle");
  const contract = await SolarSettle.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ SolarSettle deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});