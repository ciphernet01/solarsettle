import React, { useEffect, useState, useCallback } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import Navbar from '../../components/Navbar';
import TiltCard from '../../components/TiltCard';
import useTx from '../../hooks/useTx';

const INACTIVITY_WINDOW_DAYS = 7;
const DAY_MS = 24 * 3600 * 1000;

const DEMO_BASE_PROSUMERS = [
  {
    address: '0x7A9e2b5d8c14A307F6046c98C91e55761DaA0011',
    subsidyID: 'PMKUSUM-DEMO-1142',
    location: 'Bhopal, MP',
    capacityKw: '5.0',
    trustScore: 86,
    generated: 1840,
    credits: 1840,
    lastReading: new Date(Date.now() - 2 * DAY_MS).toLocaleDateString(),
    daysSilent: 2,
    atRisk: false,
    riskReason: 'Readings match panel capacity',
    isDemo: true,
  },
  {
    address: '0x2F41aCA9eD23530819f78c9C26d18D52dEaA0022',
    subsidyID: 'PMKUSUM-DEMO-2097',
    location: 'Indore, MP',
    capacityKw: '3.5',
    trustScore: 78,
    generated: 1265,
    credits: 1265,
    lastReading: new Date(Date.now() - DAY_MS).toLocaleDateString(),
    daysSilent: 1,
    atRisk: false,
    riskReason: 'Normal generation curve',
    isDemo: true,
  },
];

const FRAUD_SCENARIOS = {
  spike: {
    label: 'Meter spike',
    row: {
      address: '0xFraud0000000000000000000000000000000A91',
      subsidyID: 'PMKUSUM-FRAUD-9001',
      location: 'Jabalpur, MP',
      capacityKw: '2.0',
      trustScore: 28,
      generated: 940,
      credits: 940,
      lastReading: new Date().toLocaleDateString(),
      daysSilent: 0,
      atRisk: true,
      riskReason: 'Claimed 168 kWh in one day from a 2.0 kW panel',
      evidence: 'Generation exceeds physical capacity by 250%',
      isDemo: true,
    },
  },
  silent: {
    label: 'Silent meter',
    row: {
      address: '0xFraud0000000000000000000000000000000B72',
      subsidyID: 'PMKUSUM-FRAUD-8174',
      location: 'Ujjain, MP',
      capacityKw: '4.2',
      trustScore: 36,
      generated: 2105,
      credits: 2105,
      lastReading: new Date(Date.now() - 13 * DAY_MS).toLocaleDateString(),
      daysSilent: 13,
      atRisk: true,
      riskReason: 'No smart-meter reading for 13 days',
      evidence: 'Inactivity window exceeded by 6 days',
      isDemo: true,
    },
  },
  duplicate: {
    label: 'Duplicate subsidy',
    row: {
      address: '0xFraud0000000000000000000000000000000C53',
      subsidyID: 'PMKUSUM-DEMO-1142',
      location: 'Bhopal, MP',
      capacityKw: '5.0',
      trustScore: 22,
      generated: 0,
      credits: 0,
      lastReading: new Date().toLocaleDateString(),
      daysSilent: 0,
      atRisk: true,
      riskReason: 'Subsidy ID already belongs to another wallet',
      evidence: 'Same subsidy ID submitted from two addresses',
      isDemo: true,
    },
  },
};

export default function GovtDashboard() {
  const { isWalletConnected, account, contract, connectWallet, connecting } = useWeb3();
  const { pending, toast, run } = useTx();
  const [stats, setStats] = useState(null);
  const [pendingList, setPendingList] = useState([]);
  const [prosumers, setProsumers] = useState([]);
  const [demoRows, setDemoRows] = useState(DEMO_BASE_PROSUMERS);
  const [demoCase, setDemoCase] = useState(null);

  const load = useCallback(async () => {
    if (!contract) return;
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
        });
      }
      setPendingList(pendingRows);

      const regAddrs = await contract.registeredProsumers();
      const rows = [];
      for (const addr of regAddrs) {
        const p = await contract.getProsumer(addr);
        const lastMs = p.lastReadingTimestamp ? Number(p.lastReadingTimestamp) * 1000 : Date.now();
        const daysSilent = Math.floor((Date.now() - lastMs) / DAY_MS);
        const lowTrust = Number(p.trustScore) < 40;
        const inactive = daysSilent > INACTIVITY_WINDOW_DAYS;

        rows.push({
          address: addr,
          subsidyID: p.subsidyID,
          location: p.location,
          capacityKw: (Number(p.panelCapacity) / 1000).toFixed(1),
          trustScore: Number(p.trustScore),
          generated: Number(p.totalEnergyGenerated),
          credits: Number(p.carbonCredits),
          lastReading: new Date(lastMs).toLocaleDateString(),
          daysSilent,
          atRisk: inactive || lowTrust,
          riskReason: inactive
            ? 'No meter reading inside 7-day window'
            : lowTrust
              ? 'Low trust score'
              : 'Normal on-chain activity',
          isDemo: false,
        });
      }
      setProsumers(rows);
    } catch (e) {
      console.error(e);
    }
  }, [contract]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (addr) => {
    const ok = await run(() => contract.approveProsumer(addr), 'Approved prosumer ' + addr.slice(0, 6) + '...');
    if (ok) await load();
  };

  const handleCheckInactivity = async (addr) => {
    const ok = await run(() => contract.checkInactivity(addr), 'Inactivity check executed for ' + addr.slice(0, 6) + '...');
    if (ok) await load();
  };

  const handleDemoFraud = (scenarioKey) => {
    const scenario = FRAUD_SCENARIOS[scenarioKey];
    setDemoRows((current) => {
      const withoutExisting = current.filter((row) => row.address !== scenario.row.address);
      return [scenario.row, ...withoutExisting];
    });
    setDemoCase({ ...scenario.row, label: scenario.label, detectedAt: new Date().toLocaleTimeString() });
  };

  const handleDemoPenalty = (addr) => {
    setDemoRows((current) => current.map((row) => (
      row.address === addr
        ? { ...row, trustScore: Math.max(0, row.trustScore - 20), riskReason: row.riskReason + ' - penalty simulated' }
        : row
    )));
    setDemoCase((current) => current && current.address === addr
      ? { ...current, trustScore: Math.max(0, current.trustScore - 20), evidence: current.evidence + '; penalty simulated' }
      : current);
  };

  const handleResetDemo = () => {
    setDemoRows(DEMO_BASE_PROSUMERS);
    setDemoCase(null);
  };

  const short = (a) => a ? (a.slice(0, 6) + '...' + a.slice(-4)) : '';
  const displayProsumers = [...demoRows, ...prosumers];
  const activeFraudCount = displayProsumers.filter((p) => p.atRisk).length;
  const avgTrust = displayProsumers.length
    ? Math.round(displayProsumers.reduce((sum, p) => sum + p.trustScore, 0) / displayProsumers.length)
    : 0;

  return (
    <div className="App">
      <Navbar links={[{ label: 'Marketplace', to: '/buyer' }]} />
      <div className="dashboard">
        <h2>Government Dashboard</h2>
        <p className="dashboard-sub">Role: Government. {isWalletConnected ? ('Connected: ' + short(account)) : 'Wallet not connected.'}</p>

        {!isWalletConnected && (
          <div className="panel-form">
            <h3>Connect MetaMask to interact with the blockchain</h3>
            <p className="dashboard-sub">Approvals, penalties, and monitoring require a connected wallet.</p>
            <button className="connect-btn" onClick={connectWallet} disabled={connecting}>
              {connecting ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          </div>
        )}

        {stats && (
          <div className="card-grid">
            <TiltCard className="stat-card"><p className="stat-label">Total Generation Logged</p><p className="stat-value solar">{stats.totalKwh.toLocaleString('en-IN')} kWh</p></TiltCard>
            <TiltCard className="stat-card"><p className="stat-label">Approved Prosumers</p><p className="stat-value trust">{stats.registeredCount}</p></TiltCard>
            <TiltCard className="stat-card"><p className="stat-label">Active Listings</p><p className="stat-value">{stats.activeListings}</p></TiltCard>
            <TiltCard className="stat-card"><p className="stat-label">Pending Approvals</p><p className="stat-value" style={{ color: pendingList.length > 0 ? 'var(--accent-alert)' : undefined }}>{pendingList.length}</p></TiltCard>
          </div>
        )}

        <div className="fraud-demo-panel">
          <div>
            <p className="fraud-demo-kicker">Jury fraud simulation</p>
            <h3>Inject a suspicious smart-meter event</h3>
            <p className="dashboard-sub">Demo cases are local-only and clearly marked. Real MetaMask approvals and penalties still use the connected contract.</p>
          </div>
          <div className="fraud-demo-actions">
            <button className="nav-btn" onClick={() => handleDemoFraud('spike')}>Meter Spike</button>
            <button className="nav-btn" onClick={() => handleDemoFraud('silent')}>Silent Meter</button>
            <button className="nav-btn" onClick={() => handleDemoFraud('duplicate')}>Duplicate Subsidy</button>
            <button className="nav-btn" onClick={handleResetDemo}>Reset Demo</button>
          </div>
        </div>

        <div className="card-grid">
          <TiltCard className="stat-card"><p className="stat-label">Monitored Accounts</p><p className="stat-value">{displayProsumers.length}</p></TiltCard>
          <TiltCard className="stat-card"><p className="stat-label">Open Fraud Cases</p><p className="stat-value alert">{activeFraudCount}</p></TiltCard>
          <TiltCard className="stat-card"><p className="stat-label">Average Trust</p><p className="stat-value trust">{avgTrust}/100</p></TiltCard>
          <TiltCard className="stat-card"><p className="stat-label">Demo Mode</p><p className="stat-value solar">ON</p></TiltCard>
        </div>

        {demoCase && (
          <div className="fraud-banner">
            <h3>Fraud alert: {demoCase.label}</h3>
            <p><strong>{short(demoCase.address)}</strong> - {demoCase.riskReason}</p>
            <p>{demoCase.evidence}. Detected at {demoCase.detectedAt}.</p>
          </div>
        )}

        <h3 className="section-label" style={{ marginTop: 30 }}>Registration approvals</h3>
        {!contract ? <p className="dashboard-sub">Connect a wallet to view approvals.</p> : pendingList.length === 0 ? <p className="dashboard-sub">No pending registrations.</p> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Wallet</th><th>Subsidy ID</th><th>Location</th><th>Capacity</th><th></th></tr></thead><tbody>
            {pendingList.map((r) => (<tr key={r.address}><td className="mono">{short(r.address)}</td><td className="mono">{r.subsidyID}</td><td>{r.location}</td><td>{r.capacityKw} kW</td><td><button className="buy-btn" style={{ width: 'auto', margin: 0 }} onClick={() => handleApprove(r.address)} disabled={pending}>{pending ? 'Confirming...' : 'Approve'}</button></td></tr>))}
          </tbody></table></div>
        )}

        <h3 className="section-label" style={{ marginTop: 30 }}>Registered prosumers - live monitoring</h3>
        {displayProsumers.length === 0 ? <p className="dashboard-sub">No approved prosumers yet.</p> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Wallet</th><th>Subsidy ID</th><th>Location</th><th>Capacity</th><th>Trust</th><th>Generated</th><th>Last Reading</th><th>Risk Signal</th><th>Status</th><th></th></tr></thead><tbody>
            {displayProsumers.map((p) => (
              <tr key={p.address} className={p.atRisk ? 'risk-row' : ''}><td className="mono">{short(p.address)} {p.isDemo && <span className="demo-tag">Demo</span>}</td><td className="mono">{p.subsidyID}</td><td>{p.location}</td><td>{p.capacityKw} kW</td><td><strong>{p.trustScore}/100</strong></td><td>{p.generated} kWh</td><td>{p.lastReading} {p.daysSilent > INACTIVITY_WINDOW_DAYS ? '(' + p.daysSilent + 'd silent)' : ''}</td><td>{p.riskReason}</td><td><span className={'status-pill ' + (p.atRisk ? 'alert' : 'active')}>{p.atRisk ? 'Fraud Risk' : 'Healthy'}</span></td><td>{p.atRisk && (p.isDemo ? <button className="nav-btn" style={{ color: 'var(--accent-alert)' }} onClick={() => handleDemoPenalty(p.address)}>Sim Penalty</button> : <button className="nav-btn" style={{ color: 'var(--accent-alert)' }} onClick={() => handleCheckInactivity(p.address)} disabled={pending || !contract}>Apply Penalty</button>)}</td></tr>
            ))}
          </tbody></table></div>
        )}
      </div>
      {toast && <div className="tx-toast">{toast.text}</div>}
    </div>
  );
}
