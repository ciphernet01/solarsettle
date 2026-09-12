import { fraudScenarios, makeTelemetry, simulatedProsumers } from './lib/govtMockData';

test('government telemetry flags simulated fraud cases', () => {
  const rows = [fraudScenarios.spike.row, ...simulatedProsumers];
  const telemetry = makeTelemetry(rows);

  expect(telemetry.monitored).toBe(rows.length);
  expect(telemetry.atRisk).toBe(1);
  expect(telemetry.avgTrust).toBeLessThan(80);
});
