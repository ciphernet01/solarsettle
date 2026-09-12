import React, { useEffect, useState, useCallback } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import Navbar from '../../components/Navbar';
import TiltCard from '../../components/TiltCard';
import useTx from '../../hooks/useTx';

const INACTIVITY_WINDOW_DAYS = 7;
const DAY_MS = 24 * 3600 * 1000;

/** Government/DISCOM console: approvals, registry monitoring, fraud flags. */
export default function GovtDashboard() {
  const { account, contract } = useWeb3();
  const { pending, toast, run } = useTx();
  const [stats, setStats] = useState(null);
  const [pendingList, setPendingList] = useState([]);
  const [prosumers, setProsumers] = useState([]);

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
        const last = Number(p.lastReadingTimestamp) * 1000;
        const daysSilent = Math.floor((Date.now() - last) / DAY_MS);
        rows.push({
          address: addr,
          subsidyID: p.subsidyID,
          location: p.location,
          capacityKw: (Number(p.panelCapacity) / 1000).toFixed(1),
          trustScore: Number(p.trustScore),
          generated: Number(p.totalEnergyGenerated),
          credits: Number(p.carbonCredits),
          lastReading: new Date(last).toLocaleDateString(),
          daysSilent,
          atRisk: daysSilent > INACTIVITY_WINDOW_DAYS || Number(p.trustScore) < 40,
        });
      }
      setProsumers(rows);
    } catch (e) {
      console.error(e);
    }
  }, [contract]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (addr) => {
    const ok = await run(
      () => contract.approveProsumer(addr),
      `✅ Approved prosumer ${addr.slice(0, 6)}...${addr.slice(-4)}.`
    );
    if (ok) await load();
  };

  const handleCheckInactivity = async (addr) => {
    const ok = await run(
      () => contract.checkInactivity(addr),
      `✅ Inactivity check executed for ${addr.slice(0, 6)}...`
    );
    if (ok) await load();
  };

  const short = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <div className="App">
      <Navbar links={[{ label: 'Marketplace', to: '/buyer' }]} />
      <div className="dashboard">
        <h2>🏛️ Government Dashboard</h2>
        <p className="dashboard-sub">
          DISCOM console — signed in as the contract owner <span className="mono">{short(account)}</span>.
          Every number below is read live from the blockchain.
        </p>

        {stats && (
          <div className="card-grid">
            <TiltCard className="stat-card">
              <p className="stat-label">Total Generation Logged</p>
              <p className="stat-value solar">{stats.totalKwh.toLocaleString('en-IN')} kWh</p>
            </TiltCard>
            <TiltCard className="stat-card">
              <p className="stat-label">Approved Prosumers</p>
              <p className="stat-value trust">{stats.registeredCount}</p>
            </TiltCard>
            <TiltCard className="stat-card">
              <p className="stat-label">Active Listings</p>
              <p className="stat-value">{stats.activeListings}</p>
            </TiltCard>
            <TiltCard className="stat-card">
              <p className="stat-label">Pending Approvals</p>
              <p className="stat-value" style={{ color: pendingList.length > 0 ? 'var(--accent-alert)' : undefined }}>
                {pendingList.length}
              </p>
            </TiltCard>
          </div>
        )}

        <h3 className="section-label" style={{ marginTop: 30 }}>📝 Registration approvals</h3>
        {pendingList.length === 0 ? (
          <p className="dashboard-sub">No pending registrations.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Wallet</th><th>Subsidy ID</th><th>Location</th><th>Capacity</th><th></th></tr></thead>
              <tbody>
                {pendingList.map((r) => (
                  <tr key={r.address}>
                    <td className="mono">{short(r.address)}</td>
                    <td className="mono">{r.subsidyID}</td>
                    <td>{r.location}</td>
                    <td>{r.capacityKw} kW</td>
                    <td>
                      <button className="buy-btn" style={{ width: 'auto', margin: 0 }} onClick={() => handleApprove(r.address)} disabled={pending}>
                        {pending ? 'Confirming…' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="section-label" style={{ marginTop: 30 }}>📍 Registered prosumers — live monitoring</h3>
        {prosumers.length === 0 ? (
          <p className="dashboard-sub">No approved prosumers yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Wallet</th><th>Subsidy ID</th><th>Location</th><th>Capacity</th>
                  <th>Trust</th><th>Generated</th><th>Last Reading</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {prosumers.map((p) => (
                  <tr key={p.address}>
                    <td className="mono">{short(p.address)}</td>
                    <td className="mono">{p.subsidyID}</td>
                    <td>{p.location}</td>
                    <td>{p.capacityKw} kW</td>
                    <td><strong>{p.trustScore}/100</strong></td>
                    <td>{p.generated} kWh</td>
                    <td>{p.lastReading} {p.daysSilent > INACTIVITY_WINDOW_DAYS ? `(${p.daysSilent}d silent)` : ''}</td>
                    <td>
                      <span className={`status-pill ${p.atRisk ? 'alert' : 'active'}`}>
                        {p.atRisk ? 'Fraud Risk' : 'Healthy'}
                      </span>
                    </td>
                    <td>
                      {p.atRisk && (
                        <button className="nav-btn" style={{ color: 'var(--accent-alert)' }} onClick={() => handleCheckInactivity(p.address)} disabled={pending}>
                          Apply Penalty
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="dashboard-sub" style={{ marginTop: 16 }}>
          Trust scores drop by 20 automatically when a panel is silent for more than {INACTIVITY_WINDOW_DAYS} days
          (once per window). "Apply Penalty" triggers the on-chain <span className="mono">checkInactivity()</span> call.
        </p>
      </div>
      {toast && <div className="tx-toast">{toast.text}</div>}
    </div>
  );
}
