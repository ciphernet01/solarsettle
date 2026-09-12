import { network } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseEther } from "ethers";

async function main() {
  const { ethers } = await network.connect();
  const [owner, prosumerA, prosumerB, pendingProsumer] = await ethers.getSigners();
  const deployedPath = path.resolve("frontend/src/deployedAddress.json");
  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  const contract = await ethers.getContractAt("SolarSettle", deployed.address);

  console.log("Seeding SolarSettle demo data at", deployed.address);

  const seedProsumer = async (
    signer: typeof prosumerA,
    subsidyID: string,
    capacityW: number,
    location: string,
    kwh: number,
    listingKwh: number,
    price: string
  ) => {
    const existing = await contract.getProsumer(signer.address);
    if (!existing.registered && !existing.pendingApproval) {
      await (await contract.connect(signer).registerProsumer(subsidyID, capacityW, location)).wait();
      console.log("Registered", subsidyID, signer.address);
    }

    const latest = await contract.getProsumer(signer.address);
    if (latest.pendingApproval) {
      await (await contract.connect(owner).approveProsumer(signer.address)).wait();
      console.log("Approved", subsidyID);
    }

    await (await contract.connect(signer).logEnergyGeneration(kwh)).wait();
    await (await contract.connect(signer).listEnergy(listingKwh, parseEther(price))).wait();
    console.log("Listed", listingKwh, "kWh for", price, "native token/kWh");
  };

  await seedProsumer(prosumerA, "PMKUSUM-MP-1142", 5000, "Bhopal, MP", 22, 42, "0.018");
  await seedProsumer(prosumerB, "PMKUSUM-MP-3348", 6000, "Gwalior, MP", 29, 64, "0.0155");

  const pending = await contract.getProsumer(pendingProsumer.address);
  if (!pending.registered && !pending.pendingApproval) {
    await (await contract.connect(pendingProsumer).registerProsumer("PMKUSUM-MP-5510", 4800, "Sagar, MP")).wait();
    console.log("Created pending approval", pendingProsumer.address);
  }

  console.log("Demo seed complete. Import a Hardhat account into MetaMask to buy/list/approve.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
