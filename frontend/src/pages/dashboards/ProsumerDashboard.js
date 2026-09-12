import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWeb3 } from '../../context/Web3Context';
import Navbar from '../../components/Navbar';
import useTx from '../../hooks/useTx';
import './DashboardTheme.css';
import './ProsumerDashboard.css';
import { generateReading } from '../../lib/meterSimulator';

const DEMO_PROFILE = {
  subsidyID: 'PM-KUSUM-2025-031', panelCapacity: 8000, location: 'Ujjain, MP',
  pendingApproval: false, registered: true, trustScore: 96,
  totalEnergyGenerated: 8420, carbonCredits: 8420,
};

const DEMO_LISTINGS = [
  { id: 101, kWh: 12, priceDisplay: '0.0004', active: true },
  { id: 102, kWh: 6, priceDisplay: '0.0005', active: true },
];

export default function ProsumerDashboard() {
  const { isWalletConnected, account, contract, connectWallet, connecting } = useWeb3();
  const { pending, toast, run, setToast } = useTx();
  const [profile, setProfile] = useState(null);
  const [liveReading, setLiveReading] = useState(() => generateReading());
  const [readingHistory, setReadingHistory] = useState(() =>
    Array.from({ length: 12 }, () => generateReading()));
  const [form, setForm] = useState({ subsidyId: '', capacityKw: '', location: '' });
  const [listForm, setListForm] = useState({ kwh: '', price: '' });
  const [demoMode, setDemoMode] = useState(false);
  const [myListings, setMyListings] = useState([]);

  const loadProfile = useCallback(async () => {
    if (!contract || !isWalletConnected) {
      setProfile(DEMO_PROFILE); setDemoMode(true); setMyListings(DEMO_LISTINGS); return;
    }
    setDemoMode(false);
    try {
      const p = await contract.getProsumer(account);
      setProfile({ subsidyID: p.subsidyID, panelCapacity: Number(p.panelCapacity), location: p.location, pendingApproval: p.pendingApproval, registered: p.registered, trustScore: Number(p.trustScore), totalEnergyGenerated: Number(p.totalEnergyGenerated), carbonCredits: Number(p.carbonCredits) });
      const count = Number(await contract.listingCount());
      const mine = [];
      for (let i = 0; i < count; i++) {
        const l = await contract.listings(i);
        if (l.active && l.seller.toLowerCase() === account.toLowerCase()) {
          mine.push({ id: i, kWh: Number(l.kWh), pricePerUnit: l.pricePerUnit, priceDisplay: ethers.formatEther(l.pricePerUnit), active: true });
        }
      }
      setMyListings(mine);
    } catch (e) { console.error(e); }
  }, [contract, account, isWalletConnected]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    const t = setInterval(() => {
      const r = generateReading();
      setLiveReading(r);
      setReadingHistory((cur) => [...cur.slice(-13), r]);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const maxDailyKwh = profile ? Math.floor((profile.panelCapacity * 24) / 1000) : 0;
  const maxBarKwh = Math.max(...readingHistory.map((r) => r.kWh), 1);
  const avgKwh = (readingHistory.reduce((s, r) => s + r.kWh, 0) / readingHistory.length).toFixed(1);

  const handleRegister = async (e) => {
    e.preventDefault();
    const capacityW = Math.round(parseFloat(form.capacityKw) * 1000);
    if (!form.subsidyId || !capacityW || !form.location) return;
    const ok = await run(() => contract.registerProsumer(form.subsidyId, capacityW, form.location), 'Registration submitted - awaiting government approval.');
    if (ok) { setForm({ subsidyId: '', capacityKw: '', location: '' }); await loadProfile(); }
  };

  const handleLogReading = async () => {
    if (demoMode) {
      const kwh = Math.round(liveReading.kWh);
      setProfile((c) => ({ ...c, totalEnergyGenerated: c.totalEnergyGenerated + kwh, carbonCredits: c.carbonCredits + kwh, trustScore: Math.min(100, c.trustScore + 2) }));
      setToast({ kind: 'ok', text: 'Demo meter reading logged - profile totals updated.' });
      return;
    }
    const kwh = Math.max(1, Math.round(liveReading.kWh));
    const ok = await run(() => contract.logEnergyGeneration(kwh), 'Logged ' + kwh + ' kWh on-chain - trust score and carbon credits updated.');
    if (ok) await loadProfile();
  };

  const handleList = async (e) => {
    e.preventDefault();
    if (demoMode) { setToast({ kind: 'ok', text: 'Demo surplus listing created.' }); setListForm({ kwh: '', price: '' }); return; }
    const kwh = parseInt(listForm.kwh, 10);
    if (!kwh || !listForm.price) return;
    const ok = await run(() => contract.listEnergy(kwh, ethers.parseEther(listForm.price)), 'Energy listed on the marketplace.');
    if (ok) { setListForm({ kwh: '', price: '' }); await loadProfile(); }
  };

  const handleCancel = async (listing) => {
    if (demoMode) { setMyListings((cur) => cur.filter((l) => l.id !== listing.id)); setToast({ kind: 'ok', text: 'Demo listing #' + listing.id + ' removed.' }); return; }
    const ok = await run(() => contract.cancelListing(listing.id), 'Listing #' + listing.id + ' cancelled.');
    if (ok) await loadProfile();
  };

  return (
    <div className="App buyer-theme">
      <Navbar links={[{ label: 'Marketplace', to: '/buyer' }]} />
      <div className="dashboard">

        <span className="ps-eyebrow">Prosumer Console</span>
        <h2 style={{ marginBottom: 6 }}>My solar generation &amp; trading</h2>
        <p className="dashboard-sub">
          {isWalletConnected
            ? 'Connected: ' + account.slice(0, 6) + '...' + account.slice(-4)
            : 'Presentation preview with sample meter data.'}
        </p>

        {demoMode && (
          <div className="demo-banner">
            <div>
              <strong>Demo presentation mode</strong>
              <span>Sample meter and prosumer values are shown for review. Connect MetaMask to use live contract actions.</span>
            </div>
          </div>
        )}

        {profile && !profile.registered && !demoMode && (
          <div className="ps-card ps-section">
            <div className="ps-section-head">
              <div>
                <span className="ps-eyebrow">Getting started</span>
                <h3>Register your solar panel</h3>
              </div>
            </div>
            {profile.pendingApproval ? (
              <p className="status-pill pending">Awaiting government approval — this page updates once approved.</p>
            ) : (
              <>
                <p className="dashboard-sub">Submit your subsidy ID and panel details. The DISCOM approves registrations on-chain.</p>
                <form onSubmit={handleRegister} className="form-row">
                  <input className="form-input" placeholder="Subsidy ID (e.g. PMKUSUM-2024-0142)" value={form.subsidyId} onChange={(e) => setForm({ ...form, subsidyId: e.target.value })} />
                  <input className="form-input" type="number" step="0.1" min="0.1" placeholder="Panel capacity (kW)" value={form.capacityKw} onChange={(e) => setForm({ ...form, capacityKw: e.target.value })} />
                  <input className="form-input" placeholder="Location (e.g. Bhopal, MP)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  <button type="submit" className="connect-btn" disabled={pending}>{pending ? 'Confirming...' : 'Register on Blockchain'}</button>
                </form>
              </>
            )}
          </div>
        )}

        {/* Live meter hero */}
        <div className="ps-meter-card">
          <div className="ps-meter-left">
            <span className="ps-meter-tag"><span className="live-dot"></span> {demoMode ? 'Sample Meter Reading' : 'Live Meter Reading'}</span>
            <span className="ps-meter-value">{liveReading.kWh} <small>kWh</small></span>
          </div>
          <div className="ps-meter-right">
            <div className="ps-meter-meta">
              <span>Meter <strong>{liveReading.meterId}</strong></span>
              <span>Voltage <strong>{liveReading.voltage} V</strong></span>
              <span>{new Date(liveReading.timestamp).toLocaleTimeString()}</span>
            </div>
            <button className="buy-btn" style={{ width: 'auto', margin: 0 }} onClick={handleLogReading} disabled={pending || (profile && !profile.registered && !demoMode)}>
              {demoMode ? 'Log sample reading' : pending ? 'Confirming...' : 'Log to Blockchain'}
            </button>
          </div>
        </div>

        {/* KPIs */}
        {profile && (
          <div className="ps-kpis">
            <div className="ps-kpi">
              <div className="ps-kpi-label">Trust Score</div>
              <div className="ps-kpi-value blue">{profile.trustScore}<span style={{ fontSize: 15, color: 'var(--ss-muted)' }}> /100</span></div>
              <div className="ps-kpi-foot">+2 per verified reading</div>
            </div>
            <div className="ps-kpi">
              <div className="ps-kpi-label">Total Generated</div>
              <div className="ps-kpi-value">{profile.totalEnergyGenerated.toLocaleString('en-IN')}<span style={{ fontSize: 15, color: 'var(--ss-muted)' }}> kWh</span></div>
              <div className="ps-kpi-foot">Lifetime, on-chain</div>
            </div>
            <div className="ps-kpi">
              <div className="ps-kpi-label">Carbon Credits</div>
              <div className="ps-kpi-value green">{profile.carbonCredits.toLocaleString('en-IN')}</div>
              <div className="ps-kpi-foot">1 credit per kWh</div>
            </div>
            <div className="ps-kpi">
              <div className="ps-kpi-label">Panel Capacity</div>
              <div className="ps-kpi-value orange">{(profile.panelCapacity / 1000).toFixed(1)}<span style={{ fontSize: 15, color: 'var(--ss-muted)' }}> kW</span></div>
              <div className="ps-kpi-foot">Max {maxDailyKwh} kWh / reading</div>
            </div>
          </div>
        )}

        {/* Generation activity */}
        <div className="ps-section">
          <div className="ps-section-head">
            <div>
              <span className="ps-eyebrow">Generation Activity</span>
              <h3>Last 14 meter readings</h3>
            </div>
            <span className="ps-section-note">Avg {avgKwh} kWh · updates every 5s</span>
          </div>
          <div className="ps-chart">
            {readingHistory.map((r, i) => (
              <div
                key={r.timestamp}
                className={'ps-bar' + (i === readingHistory.length - 1 ? ' latest' : '')}
                style={{ height: Math.max(4, (r.kWh / maxBarKwh) * 100) + '%' }}
                data-value={r.kWh + ' kWh'}
              ></div>
            ))}
          </div>
          <div className="ps-chart-meta"><span>14 readings ago</span><span>now</span></div>
        </div>

        {/* My listings */}
        <div className="ps-section">
          <div className="ps-section-head">
            <div>
              <span className="ps-eyebrow">Marketplace</span>
              <h3>My active listings</h3>
            </div>
            <Link to="/buyer" className="ps-section-note" style={{ textDecoration: 'none' }}>View marketplace →</Link>
          </div>
          {myListings.length === 0 ? (
            <div className="ps-card"><p className="dashboard-sub" style={{ margin: 0 }}>No active listings. List surplus energy below to start selling.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Listing</th><th>Energy</th><th>Price / kWh</th><th>Total value</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {myListings.map((l) => (
                    <tr key={l.id}>
                      <td>#{l.id}</td>
                      <td><strong>{l.kWh} kWh</strong></td>
                      <td>{l.priceDisplay}</td>
                      <td><strong>{(l.kWh * parseFloat(l.priceDisplay)).toFixed(5)}</strong></td>
                      <td><span className="status-pill active">On sale</span></td>
                      <td><button className="nav-btn" style={{ color: 'var(--ss-red)' }} onClick={() => handleCancel(l)} disabled={pending}>Cancel</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* List surplus form */}
        {profile && profile.registered && (
          <div className="ps-section">
            <div className="ps-section-head">
              <div>
                <span className="ps-eyebrow">Sell</span>
                <h3>List surplus energy</h3>
              </div>
            </div>
            <div className="ps-card">
              <p className="dashboard-sub" style={{ marginTop: 0 }}>Max plausible per reading: {maxDailyKwh} kWh (derived from panel capacity).</p>
              <form onSubmit={handleList} className="form-row">
                <input className="form-input" type="number" step="1" min="1" placeholder="kWh to sell" value={listForm.kwh} onChange={(e) => setListForm({ ...listForm, kwh: e.target.value })} />
                <input className="form-input" type="number" step="0.0001" min="0" placeholder="Price per kWh (native token)" value={listForm.price} onChange={(e) => setListForm({ ...listForm, price: e.target.value })} />
                <button type="submit" className="connect-btn" disabled={pending}>{demoMode ? 'List sample surplus' : pending ? 'Confirming...' : 'List on Marketplace'}</button>
              </form>
            </div>
          </div>
        )}

        {/* Connect wallet */}
        {!isWalletConnected && (
          <div className="ps-section">
            <div className="ps-section-head">
              <div>
                <span className="ps-eyebrow">Blockchain</span>
                <h3>Go live with MetaMask</h3>
              </div>
            </div>
            <div className="ps-card">
              <p className="dashboard-sub" style={{ marginTop: 0 }}>Connect your wallet to register, log real readings, and trade on the marketplace.</p>
              <button className="connect-btn" onClick={connectWallet} disabled={connecting}>{connecting ? 'Connecting...' : 'Connect MetaMask'}</button>
            </div>
          </div>
        )}
      </div>
      {toast && <div className="tx-toast">{toast.text}</div>}
    </div>
  );
}
