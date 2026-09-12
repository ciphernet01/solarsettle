# ☀️ SolarSettle

**A blockchain-based transparent settlement layer for subsidized solar energy in India.**

SolarSettle lets a government/DISCOM verify in real time that subsidized solar panels
(PM-KUSUM, rooftop schemes) actually generate power, scores each prosumer's reliability
on-chain, and settles peer-to-peer energy trades atomically through a smart contract.

---

## Roles

The app is wallet-based — there are no passwords. When you sign in, your role is resolved
from the smart contract itself:

| Role | Who | Gets |
|---|---|---|
| **Government** | The wallet that deployed the contract (owner) | `/govt` — approve registrations, monitor the registry, apply inactivity penalties |
| **Prosumer** | Wallets with an approved panel registration | `/prosumer` — log readings, track trust score & carbon credits, list surplus energy |
| **Buyer** | Any other wallet | `/buyer` — browse listings, buy energy, see on-chain purchase history |

Flow: **Landing page** (public, live marketplace preview) → **Login** (wallet sign-in,
role auto-detected) → **role-specific dashboard**.

---

## Architecture

```
contracts/SolarSettle.sol     Solidity 0.8.28 — registry, trust scores, marketplace
scripts/deploy.ts             Deploys + auto-syncs address & ABI into frontend/src
test/SolarSettle.test.ts      10-test Hardhat suite (roles, scoring, marketplace)
frontend/                     React 19 SPA (react-router), ethers v6, MetaMask
```

Key contract mechanics:

- **Approval-gated registration** — prosumers register with a subsidy ID; the government
  owner must `approveProsumer()` before they can log energy or sell.
- **Physically-plausible readings** — a single reading is capped at
  `panelCapacity × 24h`; absurd (fraudulent) readings revert instead of earning trust.
- **Trust score** — starts at 70, +2 per logged reading (cap 100), −20 for 7-day
  silence, penalizable at most once per window (`checkInactivity`, callable by anyone).
- **Safe marketplace** — checks-effects-interactions, reentrancy guard, `.call`-based
  payouts with refunds, seller-cancellable listings, paginated `getActiveListings()`.
- **Carbon credits & platform stats** — 1 credit per verified kWh; `platformStats()`
  powers the landing page and dashboards.

---

## Quickstart (local)

```bash
# Terminal 1 - local chain
npm run node

# Terminal 2 - deploy (writes frontend/src/deployedAddress.json automatically)
npm run deploy:local

# Terminal 3 - frontend
cd frontend
npm install
npm start            # http://localhost:3000
```

In MetaMask, add the local network (RPC `http://127.0.0.1:8545`, chain ID `31337`) and
import a test account using a private key printed by `npm run node`.

**Try the full loop:** import the deployer's key -> that wallet is *Government* (approves
registrations). Import a second key -> register as *Prosumer* -> approve it from the
government account -> log readings, list energy. A third key is a *Buyer* who purchases
from the marketplace.

### Testnet deploy

```bash
# .env in project root
PRIVATE_KEY=0x...

npm run deploy:amoy   # Polygon Amoy (or add more networks in hardhat.config.ts)
```

`scripts/deploy.ts` rewrites `frontend/src/deployedAddress.json` and the ABI on every
deploy, so the frontend never goes stale.

---

## Commands

| Command | Purpose |
|---|---|
| `npm run compile` | Compile contracts |
| `npm test` | Run the 10-test contract suite |
| `npm run node` | Local Hardhat chain (10 funded accounts) |
| `npm run deploy:local` | Deploy to the local chain |
| `npm run deploy:amoy` | Deploy to Polygon Amoy |
| `cd frontend && npm start` | Dev server on :3000 |
| `cd frontend && npm run build` | Production bundle |

---

## Security notes

- Payouts use `.call` inside a `nonReentrant` guard; state is mutated before transfers.
- The government owner should be a multisig in production (`transferOwnership`).
- Meter data is still self-reported on-chain; production deployments should feed readings
  through an oracle bound to physical smart meters (the UI's simulated meter marks this).
- This codebase has not had an independent audit.

---

## Roadmap

- ERC-20 carbon credits (transferable/retirable) instead of counters
- Meter oracle integration (IoT gateway signing readings)
- Partial fills and time-bound listings on the marketplace
- The Graph subquery for historical analytics
