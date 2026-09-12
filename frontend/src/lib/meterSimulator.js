// Simulated smart-meter feed: realistic solar curve (0 at night, peak ~1 PM).
// In production this is replaced by an oracle feeding real meter data on-chain.
export function generateReading() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const peak = 13;
  const spread = 4;

  let kwh = 20 * Math.exp(-Math.pow(hour - peak, 2) / (2 * spread * spread));
  kwh = Math.max(0, kwh + (Math.random() * 2 - 1)); // measurement noise

  return {
    meterId: 'SIM-METER-001',
    timestamp: now.toISOString(),
    kwh: parseFloat(kwh.toFixed(2)),
    voltage: 220 + Math.floor(Math.random() * 10),
    status: 'active',
  };
}
