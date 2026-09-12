import { ethers } from 'ethers';
import abiJson from '../SolarSettleABI.json';
import { CONTRACT_ADDRESS, getChain, isContractConfigured } from '../config';

export const CONTRACT_ABI = abiJson.abi;

let chainMeta = null;

/** Configure the read-only provider's chain (called from the landing page). */
export function setDeployedChainId(id) {
  chainMeta = getChain(id);
}

/** Read-only provider for public pages (landing) — no wallet required. */
export function getPublicProvider() {
  if (!isContractConfigured() || !chainMeta) return null;
  return new ethers.JsonRpcProvider(chainMeta.rpcUrls[0]);
}

/** Fetch live marketplace data for public display. */
export async function fetchPublicMarketData() {
  const provider = getPublicProvider();
  if (!provider) return null;
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const stats = await contract.platformStats();
    const [ids, sellers, kwhs, prices] = await contract.getActiveListings(0, 6);
    const listings = ids.map((id, i) => ({
      id: Number(id),
      seller: sellers[i],
      kWh: Number(kwhs[i]),
      priceDisplay: ethers.formatEther(prices[i]),
    }));
    return {
      totalKwh: Number(stats[0]),
      totalListings: Number(stats[1]),
      activeListings: Number(stats[2]),
      registeredCount: Number(stats[3]),
      listings,
    };
  } catch {
    return null; // network/contract unavailable — landing page degrades gracefully
  }
}

/**
 * Purchase history for a buyer, read from EnergyPurchased events.
 * Queries in block chunks so public RPC range limits don't break it.
 */
export async function fetchPurchaseHistory(provider, buyer, chunkSize = 49000) {
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  const current = await provider.getBlockNumber();
  const events = [];
  for (let end = current; end > 0; end -= chunkSize) {
    const start = Math.max(0, end - chunkSize);
    const batch = await contract.queryFilter(
      contract.filters.EnergyPurchased(buyer),
      start,
      end
    );
    events.push(...batch);
    if (events.length >= 25) break; // cap history depth
  }
  return events
    .slice(0, 25)
    .reverse()
    .map((ev) => {
      const { listingId, buyer, seller, kWh } = ev.args;
      return {
        buyer,
        listingId: Number(listingId),
        seller,
        kWh: Number(kWh),
        txHash: ev.transactionHash,
        blockNumber: ev.blockNumber,
      };
    });
}
