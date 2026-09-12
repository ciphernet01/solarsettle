import React, { useEffect, useState, useCallback } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import Navbar from '../../components/Navbar';
import TiltCard from '../../components/TiltCard';
import useTx from '../../hooks/useTx';

const INACTIVITY_WINDOW_DAYS = 7;
const DAY_MS = 24 * 3600 * 1000;
const DEMO_PENDING = [
  { address: '0x7A1D00000000000000000000000000000000C101', subsidyID: 'PM-KUSUM-2026-0142', location: 'Bhopal, MP', capacityKw: '5.0' },
  { address: '0x7A1D00000000000000000000000000000000C102', subsidyID: 'ROOFTOP-2026-087', location: 'Indore, MP', capacityKw: '3.5' },
];
const DEMO_PROSUMERS = [
  { address: '0x7A1D00000000000000000000000000000000C201', subsidyID: 'PM-KUSUM-2025-031', location: 'Ujjain, MP', capacityKw: '8.0', trustScore: 96, generated: 8420, credits: 8420, lastReading: 'Today', daysSilent: 0, atRisk: false },
  { address: '0x7A1D00000000000000000000000000000000C202', subsidyID: 'ROOFTOP-2025-119', location: 'Bhopal, MP', capacityKw: '5.0', trustScore: 88, generated: 5210, credits: 5210, lastReading: 'Yesterday', daysSilent: 1, atRisk: false },
  { address: '0x7A1D00000000000000000000000000000000C203', subsidyID: 'PM-KUSUM-2024-072', location: 'Gwalior, MP', capacityKw: '10.0', trustScore: 34, generated: 6190, credits: 6190, lastReading: '9 days ago', daysSilent: 9, atRisk: true },
];

export default function GovtDashboard() {
  const { isWalletConnected, account, contract, connectWallet, connecting } = useWeb3();
  const { pending, toast, run, setToast } = useTx();
  const [stats, setStats] = useState(null);
  const [pendingList, setPendingList] = useState([]);
  const [prosumers, setProsumers] = useState([]);
  const [demoMode, setDemoMode] = useState(false);

  const load = useCallback(async () => {
    if (!contract) {
      setStats({ totalKwh: 19820, totalListings: 17, activeListings: 6, registeredCount: 12 });
      setPendingList(DEMO_PENDING);
      setProsumers(DEMO_PROSUMERS);
      setDemoMode(true);
      return;
    }
    setDemoMode(false);
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
        pendingRows.push({ address: addr, subsidyID: p.subsidyID, location: p.location, capacityKw: (Number(p.panelCapacity) / 1000).toFixed(1) });
      }
      setPendingList(pendingRows);
      const regAddrs = await contract.registeredProsumers();
      const rows = [];
      for (const addr of regAddrs) {
        const p = await contract.getProsumer(addr);
        const last = Number(p.lastReadingTimestamp) * 1000;
        const daysSilent = Math.floor((Date.now() - last) / DAY_MS);
        rows.push({
          address: addr, subsidyID: p.subsidyID, location: p.location,
          capacityKw: (Number(p.panelCapacity) / 1000).toFixed(1),
          trustScore: Number(p.trustScore), generated: Number(p.totalEnergyGenerated),
          credits: Number(p.carbonCredits), lastReading: new Date(last).toLocaleDateString(),
          daysSilent, atRisk: daysSilent > INACTIVITY_WINDOW_DAYS || Number(p.trustScore) < 40,
        });
      }
      setProsumers(rows);
    } catch (e) { console.error(e); }
  }, [contract]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (addr) => {
    if (demoMode) {
      setPendingList((current) => current.filter((item) => item.address !== addr));
      setStats((current) => ({ ...current, registeredCount: current.registeredCount + 1 }));
      setToast({ kind: 'ok', text: 'Demo approval completed - sample prosumer moved into the registry.' });
      return;
    }
    const ok = await run(() => contract.approveProsumer(addr), 'Approved prosumer ' + addr.slice(0, 6) + '...');
    if (ok) await load();
  };

  const handleCheckInactivity = async (addr) => {
    if (demoMode) {
      setProsumers((current) => current.map((prosumer) => prosumer.address === addr
        ? { ...prosumer, trustScore: Math.max(0, prosumer.trustScore - 20), atRisk: true }
        : prosumer));
      setToast({ kind: 'ok', text: 'Demo inactivity penalty applied - trust score reduced by 20 points.' });
      return;
    }
    const ok = await run(() => contract.checkInactivity(addr), 'Inactivity check executed for ' + addr.slice(0, 6) + '...');
    if (ok) await load();
  };

  const short = (a) => a ? (a.slice(0, 6) + '...' + a.slice(-4)) : '';

  return (
    <div className="App">
      <Navbar links={[{ label: 'Marketplace', to: '/buyer' }]} />
      <div className="dashboard">
        <h2>🏛️ Government Dashboard</h2>
        <p className="dashboard-sub">Role: Government. {isWalletConnected ? ('Connected: ' + short(account)) : 'Presentation preview with sample registry data.'}</p>

        {demoMode && <div className="demo-banner"><strong>Demo presentation mode</strong><span>Sample registry values are shown for review. Connect MetaMask to switch to live contract data.</span></div>}

        {!isWalletConnected && (
          <div className="panel-form">
            <h3>🔌 Connect MetaMask to interact with the blockchain</h3>
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

        <h3 className="section-label" style={{ marginTop: 30 }}>📝 Registration approvals</h3>
        {!contract ? <p className="dashboard-sub">Connect a wallet to view approvals.</p> : pendingList.length === 0 ? <p className="dashboard-sub">No pending registrations.</p> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Wallet</th><th>Subsidy ID</th><th>Location</th><th>Capacity</th><th></th></tr></thead><tbody>
            {pendingList.map((r) => (<tr key={r.address}><td className="mono">{short(r.address)}</td><td className="mono">{r.subsidyID}</td><td>{r.location}</td><td>{r.capacityKw} kW</td><td><button className="buy-btn" style={{ width: 'auto', margin: 0 }} onClick={() => handleApprove(r.address)} disabled={pending}>{demoMode ? 'Approve sample' : pending ? 'Confirming...' : 'Approve'}</button></td></tr>))}
          </tbody></table></div>
        )}

        <h3 className="section-label" style={{ marginTop: 30 }}>📍 Registered prosumers — live monitoring</h3>
        {prosumers.length === 0 ? <p className="dashboard-sub">No approved prosumers yet.</p> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Wallet</th><th>Subsidy ID</th><th>Location</th><th>Capacity</th><th>Trust</th><th>Generated</th><th>Last Reading</th><th>Status</th><th></th></tr></thead><tbody>
            {prosumers.map((p) => (
              <tr key={p.address}><td className="mono">{short(p.address)}</td><td className="mono">{p.subsidyID}</td><td>{p.location}</td><td>{p.capacityKw} kW</td><td><strong>{p.trustScore}/100</strong></td><td>{p.generated} kWh</td><td>{p.lastReading} {p.daysSilent > INACTIVITY_WINDOW_DAYS ? '(' + p.daysSilent + 'd silent)' : ''}</td><td><span className={'status-pill ' + (p.atRisk ? 'alert' : 'active')}>{p.atRisk ? 'Fraud Risk' : 'Healthy'}</span></td><td>{p.atRisk && <button className="nav-btn" style={{ color: 'var(--accent-alert)' }} onClick={() => handleCheckInactivity(p.address)} disabled={pending}>{demoMode ? 'Apply sample penalty' : 'Apply Penalty'}</button>}</td></tr>
            ))}
          </tbody></table></div>
        )}
      </div>
      {toast && <div className="tx-toast">{toast.text}</div>}
    </div>
  );
}
