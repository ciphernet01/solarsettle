import { simulatedProsumers } from './govtMockData';

const LISTINGS_KEY = 'solarsettle.sim.listings';
const PURCHASES_KEY = 'solarsettle.sim.purchases';
const EVENT_NAME = 'solarsettle-sim-update';

const nowIso = () => new Date().toISOString();

export const demoProsumer = simulatedProsumers[0];

export const defaultListings = [
  {
    id: 'SIM-1001',
    seller: simulatedProsumers[0].address,
    subsidyID: simulatedProsumers[0].subsidyID,
    meterId: simulatedProsumers[0].meterId,
    location: simulatedProsumers[0].location,
    kWh: 42,
    priceDisplay: '0.0180',
    trustScore: simulatedProsumers[0].trustScore,
    source: 'Simulated',
    active: true,
    createdAt: nowIso(),
  },
  {
    id: 'SIM-1002',
    seller: simulatedProsumers[2].address,
    subsidyID: simulatedProsumers[2].subsidyID,
    meterId: simulatedProsumers[2].meterId,
    location: simulatedProsumers[2].location,
    kWh: 64,
    priceDisplay: '0.0155',
    trustScore: simulatedProsumers[2].trustScore,
    source: 'Simulated',
    active: true,
    createdAt: nowIso(),
  },
];

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // Demo state is best-effort; the UI can still run from defaults.
  }
}

export function onSimulationChange(handler) {
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}

export function getSimListings() {
  return readJson(LISTINGS_KEY, defaultListings);
}

export function addSimListing({ kWh, priceDisplay, seller = demoProsumer }) {
  const listing = {
    id: `SIM-${Date.now().toString().slice(-6)}`,
    seller: seller.address,
    subsidyID: seller.subsidyID,
    meterId: seller.meterId,
    location: seller.location,
    kWh,
    priceDisplay,
    trustScore: seller.trustScore,
    source: 'Simulated',
    active: true,
    createdAt: nowIso(),
  };
  writeJson(LISTINGS_KEY, [listing, ...getSimListings()]);
  return listing;
}

export function buySimListing(listing, buyerAddress = '0xDemoBuyer') {
  const listings = getSimListings().map((item) => (
    item.id === listing.id ? { ...item, active: false, settledAt: nowIso() } : item
  ));
  const purchase = {
    id: `PUR-${Date.now().toString().slice(-6)}`,
    listingId: listing.id,
    seller: listing.seller,
    buyer: buyerAddress,
    kWh: listing.kWh,
    totalDisplay: (listing.kWh * Number(listing.priceDisplay)).toFixed(4),
    source: 'Simulated',
    createdAt: nowIso(),
  };
  writeJson(LISTINGS_KEY, listings);
  writeJson(PURCHASES_KEY, [purchase, ...getSimPurchases()]);
  return purchase;
}

export function getSimPurchases() {
  return readJson(PURCHASES_KEY, []);
}
