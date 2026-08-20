# ☀️ SolarSettle

**A blockchain-based transparent settlement layer for subsidized solar energy in India.**

SolarSettle enables the government to verify in real-time that subsidized solar panels (PM-KUSUM, rooftop schemes) are actually generating power, while allowing prosumers to trade excess solar energy locally through a trusted, DISCOM-integrated P2P marketplace.

---

## 🔗 Live Deployment

**Smart Contract (Polygon Amoy Testnet):**
`0x9741cCAaB06588c2cA9AAa6223510b35F36A9E01`

View on PolygonScan: https://amoy.polygonscan.com/address/0x9741cCAaB06588c2cA9AAa6223510b35F36A9E01

---

## 🚩 Problem

- **Subsidy fraud**: Government disburses solar subsidies but has no way to verify if panels are functioning.
- **Energy waste**: Excess daytime solar generation goes unused in rural households while evening demand goes unmet.
- **Trust gap**: No reliable way to verify P2P energy trades — meter readings can be faked.

## 💡 Solution

SolarSettle logs every energy reading immutably on-chain, calculates a trust score per prosumer to flag fraud, and enables automated peer-to-peer energy trading — all while integrating with (not bypassing) DISCOM infrastructure.

---

## ⚙️ Features

- **Real-time Subsidy Verification** — Government dashboard shows live generation data per subsidized panel.
- **On-Chain Trust Score** — Reputation system that flags inconsistent or fraudulent meter data.
- **AI-Powered Generation Forecasting** — Predicts next-day solar output.
- **P2P Energy Marketplace** — List and buy excess energy, settled via smart contract.
- **Carbon Credit Minting** — Every verified kWh generates a micro carbon credit token.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Solidity, Hardhat 3, Polygon Amoy Testnet |
| Frontend | React |
| Web3 | Ethers.js |
| Wallet | MetaMask |

---

## 📂 Project Structure