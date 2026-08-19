// Generates realistic solar generation curve: 0 at night, peak at noon
export function generateReading() {
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const peak = 13; // 1 PM peak
  const spread = 4;

  let kWh = 20 * Math.exp(-Math.pow(hour - peak, 2) / (2 * spread * spread));
  kWh = Math.max(0, kWh + (Math.random() * 2 - 1)); // thoda noise add karo

  return {
    meterId: 'MP-12345',
    timestamp: new Date().toISOString(),
    kWh: parseFloat(kWh.toFixed(2)),
    voltage: 220 + Math.floor(Math.random() * 10),
    status: 'active',
  };
}