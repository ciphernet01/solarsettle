import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import Navbar from '../../components/Navbar';
import useTx from '../../hooks/useTx';
import {
  baselineGovtStats,
  fraudScenarios,
  makeTelemetry,
  simulatedPendingApprovals,
  simulatedProsumers,
} from '../../lib/govtMockData';
import { getSimListings, onSimulationChange } from '../../lib/sharedSimulation';

const INACTIVITY_WINDOW_DAYS = 7;
const DAY_MS = 24 * 3600 * 1000;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'risk', label: 'Risk' },
  { key: 'healthy', label: 'Healthy' },
  { key: 'chain', label: 'On-chain' },
];

export default function GovtDashboard() {
  const { isWalletConnected, account, contract, connectWallet, connecting, chain, configured } = useWeb3();
  const { pending, toast, run } = useTx();
  const [stats, setStats] = useState(baselineGovtStats);
  const [pendingList, setPendingList] = useState(simulatedPendingApprovals);
  const [chainPending, setChainPending] = useState([]);
  const [chainRows, setChainRows] = useState([]);
  const [simRows, setSimRows] = useState(simulatedProsumers);
  const [simListings, setSimListings] = useState(() => getSimListings());
  const [selectedAddress, setSelectedAddress] = useState(simulatedProsumers[0].address);
  const [filter, setFilter] = useState('all');
  const [lastSync, setLastSync] = useState(new Date());
  const [events, setEvents] = useState([
    'Telemetry synced from simulated feeder network',
    'Subsidy registry cross-check completed',
    'MetaMask transaction layer standing by',
  ]);

  const short = (a) => a ? (a.slice(0, 6) + '...' + a.slice(-4)) : '';

  const load = useCallback(async () => {
    if (!contract) {
      setStats(baselineGovtStats);
      setPendingList(simulatedPendingApprovals);
      setChainPending([]);
      setChainRows([]);
      setLastSync(new Date());
      return;
    }

    try {
      const s = await contract.platformStats();
      setStats({
        totalKwh: Number(s[0]),
        totalListings: Number(s[1]),
        activeListings: Number(s[2]),
        registeredCount: Number(s[3]),
      });

      const pendingAddrs = await contract.pendingProsumers();
      const pendingRows = [];
      for (const addr of pendingAddrs) {
        const p = await contract.getProsumer(addr);
        pendingRows.push({
          address: addr,
          subsidyID: p.subsidyID,
          location: p.location,
          capacityKw: (Number(p.panelCapacity) / 1000).toFixed(1),
          source: 'On-chain',
        });
      }
      setChainPending(pendingRows);
      setPendingList([...pendingRows, ...simulatedPendingApprovals]);

      const regAddrs = await contract.registeredProsumers();
      const rows = [];
      for (const addr of regAddrs) {
        const p = await contract.getProsumer(addr);
        const lastMs = p.lastReadingTimestamp ? Number(p.lastReadingTimestamp) * 1000 : Date.now();
        const daysSilent = Math.max(0, Math.floor((Date.now() - lastMs) / DAY_MS));
        const trustScore = Number(p.trustScore);
        const inactive = daysSilent > INACTIVITY_WINDOW_DAYS;
        const lowTrust = trustScore < 40;

        rows.push({
          address: addr,
          subsidyID: p.subsidyID,
          location: p.location,
          feeder: 'CHAIN-FEED',
          meterId: 'ONCHAIN-' + addr.slice(2, 8).toUpperCase(),
          capacityKw: (Number(p.panelCapacity) / 1000).toFixed(1),
          trustScore,
          generated: Number(p.totalEnergyGenerated),
          credits: Number(p.carbonCredits),
          lastReading: new Date(lastMs).toLocaleDateString(),
          daysSilent,
          lastKwh: 0,
          expectedKwh: Math.round((Number(p.panelCapacity) * 5) / 1000),
          riskScore: inactive ? 76 : lowTrust ? 68 : Math.max(8, 100 - trustScore),
          riskReason: inactive
            ? 'No meter reading inside the 7-day window'
            : lowTrust
              ? 'Trust score below intervention threshold'
              : 'Normal on-chain activity',
          anomalyTags: inactive ? ['meter silent'] : lowTrust ? ['low trust'] : ['on-chain verified'],
          status: inactive || lowTrust ? 'Fraud Risk' : 'Healthy',
          source: 'On-chain',
        });
      }
      setChainRows(rows);
      setLastSync(new Date());
      setEvents((current) => ['On-chain registry refreshed through MetaMask provider', ...current].slice(0, 6));
    } catch (e) {
      console.error(e);
      setEvents((current) => ['Contract read failed; continuing with simulated command data', ...current].slice(0, 6));
    }
  }, [contract]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => onSimulationChange(() => setSimListings(getSimListings())), []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSimRows((rows) => rows.map((row) => {
        if (row.status === 'Fraud Risk') return row;
        const drift = Math.round((Math.random() * 4) - 2);
        return {
          ...row,
          lastKwh: Math.max(0, row.expectedKwh + drift),
          riskScore: Math.max(5, Math.min(30, row.riskScore + Math.round(Math.random() * 4 - 2))),
        };
      }));
      setLastSync(new Date());
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const displayRows = useMemo(() => [...simRows, ...chainRows], [simRows, chainRows]);
  const telemetry = useMemo(() => makeTelemetry(displayRows), [displayRows]);
  const activeSimListings = simListings.filter((item) => item.active);
  const selectedCase = displayRows.find((row) => row.address === selectedAddress) || displayRows[0];

  const visibleRows = displayRows.filter((row) => {
    if (filter === 'risk') return row.status === 'Fraud Risk';
    if (filter === 'healthy') return row.status === 'Healthy';
    if (filter === 'chain') return row.source === 'On-chain';
    return true;
  });

  const handleApprove = async (row) => {
    if (row.source !== 'On-chain') {
      setEvents((current) => [`Simulated approval held for ${row.subsidyID}`, ...current].slice(0, 6));
      return;
    }
    const ok = await run(() => contract.approveProsumer(row.address), 'Approved prosumer ' + short(row.address));
    if (ok) await load();
  };

  const handlePenalty = async (row) => {
    if (row.source !== 'On-chain') {
      setSimRows((rows) => rows.map((item) => item.address === row.address
        ? { ...item, trustScore: Math.max(0, item.trustScore - 20), anomalyTags: [...new Set([...item.anomalyTags, 'penalty simulated'])] }
        : item));
      setEvents((current) => [`Penalty simulated for ${row.meterId}`, ...current].slice(0, 6));
      return;
    }
    const ok = await run(() => contract.checkInactivity(row.address), 'Inactivity penalty checked for ' + short(row.address));
    if (ok) await load();
  };

  const injectFraud = (scenarioKey) => {
    const scenario = fraudScenarios[scenarioKey];
    setSimRows((rows) => {
      const deduped = rows.filter((row) => row.address !== scenario.row.address);
      return [scenario.row, ...deduped];
    });
    setSelectedAddress(scenario.row.address);
    setFilter('risk');
    setEvents((current) => [`${scenario.label} detected: ${scenario.row.evidence}`, ...current].slice(0, 6));
  };

  const resetSimulation = () => {
    setSimRows(simulatedProsumers);
    setSelectedAddress(simulatedProsumers[0].address);
    setFilter('all');
    setEvents((current) => ['Simulation reset to verified operating baseline', ...current].slice(0, 6));
  };

  return (
    <div className="App govt-app">
      <Navbar links={[{ label: 'Marketplace', to: '/buyer' }]} />
      <main className="govt-console">
        <section className="govt-hero">
          <div>
            <p className="eyebrow">SolarSettle regulatory command center</p>
            <h2>Government Monitoring Dashboard</h2>
            <p className="dashboard-sub">Approve prosumers, monitor meter anomalies, and route enforcement through MetaMask-backed smart-contract transactions.</p>
          </div>
          <div className="wallet-status">
            <span className={'connection-dot ' + (isWalletConnected ? 'online' : 'offline')}></span>
            <div>
              <strong>{isWalletConnected ? short(account) : 'MetaMask not connected'}</strong>
              <span>{isWalletConnected ? `Connected to ${chain?.chainName || 'configured network'}` : configured ? 'Connect to approve and penalize on-chain' : 'Deploy contract before live writes'}</span>
            </div>
            {!isWalletConnected && (
              <button className="connect-btn" onClick={connectWallet} disabled={connecting}>
                {connecting ? 'Connecting...' : 'Connect MetaMask'}
              </button>
            )}
          </div>
        </section>

        <section className="ops-strip">
          <Metric label="Generation Logged" value={`${stats.totalKwh.toLocaleString('en-IN')} kWh`} />
          <Metric label="Registered Prosumers" value={(stats.registeredCount || telemetry.monitored).toLocaleString('en-IN')} />
          <Metric label="Open Risk Cases" value={telemetry.atRisk} tone={telemetry.atRisk ? 'alert' : 'good'} />
          <Metric label="Average Trust" value={`${telemetry.avgTrust}/100`} tone="good" />
          <Metric label="Market Listings" value={stats.activeListings + activeSimListings.length} />
        </section>

        <section className="govt-workbench">
          <div className="workbench-main">
            <div className="toolbar-row">
              <div>
                <h3>Risk Queue</h3>
                <p>Last sync {lastSync.toLocaleTimeString()}</p>
              </div>
              <div className="segmented">
                {FILTERS.map((item) => (
                  <button key={item.key} className={filter === item.key ? 'active' : ''} onClick={() => setFilter(item.key)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="scenario-row">
              {Object.entries(fraudScenarios).map(([key, scenario]) => (
                <button key={key} onClick={() => injectFraud(key)}>
                  <strong>{scenario.label}</strong>
                  <span>{scenario.action}</span>
                </button>
              ))}
              <button onClick={resetSimulation}>
                <strong>Reset</strong>
                <span>Restore verified baseline</span>
              </button>
            </div>

            <div className="table-wrap risk-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Prosumer</th>
                    <th>Meter</th>
                    <th>Observed</th>
                    <th>Expected</th>
                    <th>Trust</th>
                    <th>Risk</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.address} className={row.address === selectedCase?.address ? 'selected-row' : ''} onClick={() => setSelectedAddress(row.address)}>
                      <td><strong>{row.subsidyID}</strong><span>{short(row.address)} - {row.location}</span></td>
                      <td><strong>{row.meterId}</strong><span>{row.feeder}</span></td>
                      <td>{row.lastKwh} kWh</td>
                      <td>{row.expectedKwh} kWh</td>
                      <td><strong>{row.trustScore}/100</strong></td>
                      <td><RiskBar value={row.riskScore} /></td>
                      <td><span className={'status-pill ' + (row.status === 'Fraud Risk' ? 'alert' : 'active')}>{row.status}</span></td>
                      <td><button className="nav-btn inspect-btn" onClick={(e) => { e.stopPropagation(); setSelectedAddress(row.address); }}>Inspect</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="approval-panel">
              <div className="toolbar-row compact">
                <div>
                  <h3>Registration Approvals</h3>
                  <p>{chainPending.length} on-chain, {simulatedPendingApprovals.length} simulated</p>
                </div>
              </div>
              <div className="approval-list">
                {pendingList.map((row) => (
                  <div className="approval-item" key={row.address}>
                    <div>
                      <strong>{row.subsidyID}</strong>
                      <span>{short(row.address)} - {row.location} - {row.capacityKw} kW</span>
                      {row.risk && <em>{row.risk}</em>}
                    </div>
                    <button className="buy-btn" onClick={() => handleApprove(row)} disabled={pending && row.source === 'On-chain'}>
                      {row.source === 'On-chain' ? (pending ? 'Confirming...' : 'Approve') : 'Review'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="case-panel">
            {selectedCase && (
              <>
                <div className="case-head">
                  <span className={'source-badge ' + selectedCase.source.toLowerCase()}>{selectedCase.source}</span>
                  <h3>{selectedCase.status === 'Fraud Risk' ? 'Incident Case' : 'Verified Account'}</h3>
                  <p>{selectedCase.riskReason}</p>
                </div>
                <dl className="case-facts">
                  <div><dt>Wallet</dt><dd>{short(selectedCase.address)}</dd></div>
                  <div><dt>Subsidy</dt><dd>{selectedCase.subsidyID}</dd></div>
                  <div><dt>Meter</dt><dd>{selectedCase.meterId}</dd></div>
                  <div><dt>Credits</dt><dd>{selectedCase.credits.toLocaleString('en-IN')}</dd></div>
                  <div><dt>Last Reading</dt><dd>{selectedCase.lastReading}</dd></div>
                  <div><dt>Silent Days</dt><dd>{selectedCase.daysSilent}</dd></div>
                </dl>
                <div className="tag-stack">
                  {selectedCase.anomalyTags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <button className="connect-btn case-action" onClick={() => handlePenalty(selectedCase)} disabled={pending && selectedCase.source === 'On-chain'}>
                  {selectedCase.source === 'On-chain' ? 'Run MetaMask Enforcement' : 'Simulate Enforcement'}
                </button>
              </>
            )}

            <div className="event-feed">
              <h3>Audit Trail</h3>
              {events.map((event, index) => (
                <p key={event + index}><span>{index === 0 ? 'Now' : `${index * 2}m`}</span>{event}</p>
              ))}
            </div>
          </aside>
        </section>
      </main>
      {toast && <div className="tx-toast">{toast.text}</div>}
    </div>
  );
}

function Metric({ label, value, tone = 'neutral' }) {
  return (
    <div className={'ops-metric ' + tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RiskBar({ value }) {
  return (
    <div className="risk-meter" aria-label={`Risk ${value} percent`}>
      <span style={{ width: `${Math.max(4, Math.min(100, value))}%` }}></span>
      <strong>{value}</strong>
    </div>
  );
}
