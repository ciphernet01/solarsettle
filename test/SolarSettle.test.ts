import { expect } from "chai";
import { network } from "hardhat";
import { parseEther } from "ethers";

describe("SolarSettle", function () {
  async function deployFixture() {
    const { ethers } = await network.connect();
    const [owner, prosumer, buyer, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("SolarSettle");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return { ethers, contract, owner, prosumer, buyer, other };
  }

  async function withApprovedProsumer() {
    const base = await deployFixture();
    await base.contract
      .connect(base.prosumer)
      .registerProsumer("PMKUSUM-001", 5000, "Bhopal, MP");
    await base.contract.connect(base.owner).approveProsumer(base.prosumer.address);
    return base;
  }

  it("deploys with the deployer as government owner", async function () {
    const { contract, owner } = await deployFixture();
    expect(await contract.owner()).to.equal(owner.address);
  });

  it("registration is pending until the government approves it", async function () {
    const { contract, owner, prosumer } = await deployFixture();

    await contract.connect(prosumer).registerProsumer("PMKUSUM-001", 5000, "Bhopal, MP");

    let p = await contract.getProsumer(prosumer.address);
    expect(p.pendingApproval).to.equal(true);
    expect(p.registered).to.equal(false);
    expect(p.trustScore).to.equal(70n);

    // Cannot log energy or self-approve before approval
    await expect(
      contract.connect(prosumer).logEnergyGeneration(10)
    ).to.be.revertedWith("Not a registered prosumer");
    await expect(
      contract.connect(prosumer).approveProsumer(prosumer.address)
    ).to.be.revertedWith("Not authorized");

    await contract.connect(owner).approveProsumer(prosumer.address);
    p = await contract.getProsumer(prosumer.address);
    expect(p.pendingApproval).to.equal(false);
    expect(p.registered).to.equal(true);
  });

  it("only the owner can approve and ownership can be transferred", async function () {
    const { contract, owner, prosumer, other } = await deployFixture();
    await contract.connect(prosumer).registerProsumer("SUB", 3000, "Indore");
    await expect(
      contract.connect(other).approveProsumer(prosumer.address)
    ).to.be.revertedWith("Not authorized");

    await contract.connect(owner).transferOwnership(other.address);
    expect(await contract.owner()).to.equal(other.address);
    await expect(
      contract.connect(owner).transferOwnership(other.address)
    ).to.be.revertedWith("Not authorized");
  });

  it("rejects absurd readings and accepts plausible ones", async function () {
    const { contract, prosumer } = await withApprovedProsumer();
    // 5000 W panel => max 120 kWh per reading (5000*24/1000)
    await expect(contract.connect(prosumer).logEnergyGeneration(121))
      .to.be.revertedWith("Reading exceeds plausible generation");

    await contract.connect(prosumer).logEnergyGeneration(50);
    const p = await contract.getProsumer(prosumer.address);
    expect(p.totalEnergyGenerated).to.equal(50n);
    expect(p.carbonCredits).to.equal(50n);
    expect(p.trustScore).to.equal(72n);
    expect(await contract.totalKwhLogged()).to.equal(50n);
  });

  it("trust score increases with readings and caps at 100", async function () {
    const { contract, prosumer } = await withApprovedProsumer();
    for (let i = 0; i < 20; i++) {
      await contract.connect(prosumer).logEnergyGeneration(10);
    }
    const p = await contract.getProsumer(prosumer.address);
    expect(p.trustScore).to.equal(100n);
  });

  it("penalizes inactivity only once per 7-day window", async function () {
    const { ethers, contract, prosumer } = await withApprovedProsumer();
    await contract.connect(prosumer).logEnergyGeneration(10);

    // Fast-forward 8 days
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 3600]);
    await ethers.provider.send("evm_mine", []);

    await contract.connect(prosumer).checkInactivity(prosumer.address);
    let p = await contract.getProsumer(prosumer.address);
    expect(p.trustScore).to.equal(52n); // 72 after logging, minus 20 penalty

    // Immediate second call must be a no-op (no penalty spam)
    await contract.connect(prosumer).checkInactivity(prosumer.address);
    p = await contract.getProsumer(prosumer.address);
    expect(p.trustScore).to.equal(52n);

    // Another 8 days later it penalizes again
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 3600]);
    await ethers.provider.send("evm_mine", []);
    await contract.connect(prosumer).checkInactivity(prosumer.address);
    p = await contract.getProsumer(prosumer.address);
    expect(p.trustScore).to.equal(32n);
  });

  it("lists, cancels, and pages active listings", async function () {
    const { contract, prosumer, other } = await withApprovedProsumer();
    await contract.connect(prosumer).listEnergy(10, parseEther("0.5"));
    await contract.connect(prosumer).listEnergy(20, parseEther("0.4"));
    expect(await contract.listingCount()).to.equal(2n);

    await expect(
      contract.connect(other).cancelListing(0)
    ).to.be.revertedWith("Not the seller");

    await contract.connect(prosumer).cancelListing(0);
    const [ids, sellers, kwhs, prices] = await contract.getActiveListings(0, 10);
    expect(ids.length).to.equal(1);
    expect(ids[0]).to.equal(1n);
    expect(sellers[0]).to.equal(prosumer.address);
    expect(kwhs[0]).to.equal(20n);
    expect(prices[0]).to.equal(parseEther("0.4"));
  });

  it("settles purchases, pays the seller, and refunds overpayment", async function () {
    const { ethers, contract, prosumer, buyer } = await withApprovedProsumer();
    await contract.connect(prosumer).listEnergy(10, parseEther("0.5"));

    const price = 10n * parseEther("0.5"); // 5 ETH
    const sellerBefore = await ethers.provider.getBalance(prosumer.address);

    // Overpay by 1 ETH — excess must be refunded
    await contract
      .connect(buyer)
      .buyEnergy(0, { value: price + parseEther("1") });

    const sellerAfter = await ethers.provider.getBalance(prosumer.address);
    expect(sellerAfter - sellerBefore).to.equal(price);
    expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(0n);

    const [, , kwhs] = await contract.getActiveListings(0, 10);
    expect(kwhs.length).to.equal(0); // listing consumed
  });

  it("rejects invalid purchases", async function () {
    const { contract, prosumer, buyer } = await withApprovedProsumer();
    await contract.connect(prosumer).listEnergy(10, parseEther("0.5"));

    await expect(
      contract.connect(prosumer).buyEnergy(0, { value: parseEther("5") })
    ).to.be.revertedWith("Cannot buy your own listing");

    await expect(
      contract.connect(buyer).buyEnergy(0, { value: parseEther("4.9") })
    ).to.be.revertedWith("Insufficient payment");

    // A consumed listing can't be bought twice
    await contract.connect(buyer).buyEnergy(0, { value: parseEther("5") });
    await expect(
      contract.connect(buyer).buyEnergy(0, { value: parseEther("5") })
    ).to.be.revertedWith("Listing not active");
  });

  it("exposes platform stats and pending list for the government", async function () {
    const { contract, prosumer, other } = await withApprovedProsumer();
    await contract.connect(prosumer).logEnergyGeneration(20);
    await contract.connect(prosumer).listEnergy(10, parseEther("0.1"));

    const [totalKwh, listings, active, registered] = await contract.platformStats();
    expect(totalKwh).to.equal(20n);
    expect(listings).to.equal(1n);
    expect(active).to.equal(1n);
    expect(registered).to.equal(1n);

    // A pending registration shows up in the pending list only
    await contract.connect(other).registerProsumer("SUB-2", 4000, "Ujjain");
    const pending = await contract.pendingProsumers();
    expect(pending.length).to.equal(1);
    expect(pending[0]).to.equal(other.address);
  });
});
