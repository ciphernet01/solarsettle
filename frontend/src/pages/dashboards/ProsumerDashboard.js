import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWeb3 } from '../../context/Web3Context';
import Navbar from '../../components/Navbar';
import TiltCard from '../../components/TiltCard';
import useTx from '../../hooks/useTx';
import { generateReading } from '../../lib/meterSimulator';

export default function ProsumerDashboard() {
  const { isWalletConnected, account, contract, connectWallet, connecting } = useWeb3();
  const { pending, toast, run } = useTx();
  const [profile, setProfile] = useState(null);
  const [liveReading, setLiveReading] = useState(() => generateReading());
  const [form, setForm] = useState({ subsidyId: '', capacityKw: '', location: '' });
  const [listForm, setListForm] = useState({ kwh: '', price: '' });

  const loadProfile = useCallback(async () => {
    if (!contract || !isWalletConnected) return;
    try {
      const p = await contract.getProsumer(account);
      setProfile({ subsidyID: p.subsidyID, panelCapacity: Number(p.panelCapacity), location: p.location, pendingApproval: p.pendingApproval, registered: p.registered, trustScore: Number(p.trustScore), totalEnergyGenerated: Number(p.totalEnergyGenerated), carbonCredits: Number(p.carbonCredits) });
    } catch (e) { console.error(e); }
  }, [contract, account, isWalletConnected]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { const t = setInterval(() => setLiveReading(generateReading()), 5000); return () => clearInterval(t); }, []);

  const maxDailyKwh = profile ? Math.floor((profile.panelCapacity * 24) / 1000) : 0;

  const handleRegister = async (e) => {
    e.preventDefault();
    const capacityW = Math.round(parseFloat(form.capacityKw) * 1000);
    if (!form.subsidyId || !capacityW || !form.location) return;
    const ok = await run(() => contract.registerProsumer(form.subsidyId, capacityW, form.location), 'Registration submitted - awaiting government approval.');
    if (ok) { setForm({ subsidyId: '', capacityKw: '', location: '' }); await loadProfile(); }
  };

  const handleLogReading = async () => {
    const kwh = Math.max(1, Math.round(liveReading.kWh));
    const ok = await run(() => contract.logEnergyGeneration(kwh), 'Logged ' + kwh + ' kWh on-chain - trust score and carbon credits updated.');
    if (ok) await loadProfile();
  };

  const handleList = async (e) => {
    e.preventDefault();
    const kwh = parseInt(listForm.kwh, 10);
    if (!kwh || !listForm.price) return;
    const ok = await run(() => contract.listEnergy(kwh, ethers.parseEther(listForm.price)), 'Energy listed on the marketplace.');
    if (ok) setListForm({ kwh: '', price: '' });
  };

  return (
    <div className="App">
      <Navbar links={[{ label: 'Marketplace', to: '/buyer' }]} />
      <div className="dashboard">
        <h2>Prosumer Dashboard</h2>
        <p className="dashboard-sub">Role: Prosumer. {isWalletConnected ? ('Connected: ' + account.slice(0, 6) + '...' + account.slice(-4)) : 'Wallet not connected.'}</p>

        {!isWalletConnected && (
          <div className="panel-form">
            <h3>🔌 Connect MetaMask to interact with the blockchain</h3>
            <p className="dashboard-sub">Register your panel, log energy, and list surplus - all require a connected wallet.</p>
            <button className="connect-btn" onClick={connectWallet} disabled={connecting}>{connecting ? 'Connecting...' : 'Connect MetaMask'}</button>
          </div>
        )}

        {isWalletConnected && profile && !profile.registered && (
          <div className="panel-form">
            <h3>📝 Register your solar panel</h3>
            {profile.pendingApproval ? <p className="status-pill pending">Awaiting government approval - this page updates once approved.</p> : (<>
              <p className="dashboard-sub">Submit your subsidy ID and panel details. The government/DISCOM approves registrations on-chain.</p>
              <form onSubmit={handleRegister} className="form-row">
                <input className="form-input" placeholder="Subsidy ID (e.g. PMKUSUM-2024-0142)" value={form.subsidyId} onChange={(e) => setForm({ ...form, subsidyId: e.target.value })} />
                <input className="form-input" type="number" step="0.1" min="0.1" placeholder="Panel capacity (kW)" value={form.capacityKw} onChange={(e) => setForm({ ...form, capacityKw: e.target.value })} />
                <input className="form-input" placeholder="Location (e.g. Bhopal, MP)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                <button type="submit" className="connect-btn" disabled={pending}>{pending ? 'Confirming...' : 'Register on Blockchain'}</button>
              </form></>)}
          </div>
        )}

        {isWalletConnected && profile && profile.registered && (<>
          <div className="live-card"><div><div className="live-tag"><span className="live-dot"></span> Live Meter Reading</div><div className="live-value">{liveReading.kWh} kWh</div></div><div style={{ display: 'flex', alignItems: 'center', gap: 16 }}><div className="live-meta">{liveReading.voltage}V · {new Date(liveReading.timestamp).toLocaleTimeString()}</div><button className="buy-btn" style={{ width: 'auto', margin: 0 }} onClick={handleLogReading} disabled={pending}>{pending ? 'Confirming...' : 'Log to Blockchain'}</button></div></div>
          <div className="card-grid">
            <TiltCard className="stat-card"><p className="stat-label">Trust Score (on-chain)</p><p className="stat-value trust">{profile.trustScore}/100</p></TiltCard>
            <TiltCard className="stat-card"><p className="stat-label">Total Generated</p><p className="stat-value">{profile.totalEnergyGenerated} kWh</p></TiltCard>
            <TiltCard className="stat-card"><p className="stat-label">Carbon Credits</p><p className="stat-value solar">{profile.carbonCredits}</p></TiltCard>
            <TiltCard className="stat-card"><p className="stat-label">Panel Capacity</p><p className="stat-value">{(profile.panelCapacity / 1000).toFixed(1)} kW</p></TiltCard>
          </div>
          <div className="panel-form"><h3>💡 List surplus energy on the marketplace</h3><p className="dashboard-sub">Max plausible per reading: {maxDailyKwh} kWh (derived from panel capacity).</p><form onSubmit={handleList} className="form-row"><input className="form-input" type="number" step="1" min="1" placeholder="kWh to sell" value={listForm.kwh} onChange={(e) => setListForm({ ...listForm, kwh: e.target.value })} /><input className="form-input" type="number" step="0.0001" min="0" placeholder="Price per kWh (native token)" value={listForm.price} onChange={(e) => setListForm({ ...listForm, price: e.target.value })} /><button type="submit" className="connect-btn" disabled={pending}>{pending ? 'Confirming...' : 'List on Marketplace'}</button></form></div>
          <p className="dashboard-sub" style={{ marginTop: 18 }}>Head to the <Link to="/buyer">buyer marketplace</Link> to see your listing live.</p>
        </>)}
      </div>
      {toast && <div className="tx-toast">{toast.text}</div>}
    </div>
  );
}
