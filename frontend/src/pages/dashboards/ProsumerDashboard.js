import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWeb3 } from '../../context/Web3Context';
import Navbar from '../../components/Navbar';
import useTx from '../../hooks/useTx';
import { generateReading } from '../../lib/meterSimulator';
import { addSimListing, demoProsumer, getSimListings, onSimulationChange } from '../../lib/sharedSimulation';

export default function ProsumerDashboard() {
  const { isWalletConnected, account, contract, connectWallet, connecting, chain } = useWeb3();
  const { pending, toast, run } = useTx();
  const [profile, setProfile] = useState(null);
  const [liveReading, setLiveReading] = useState(() => generateReading());
  const [form, setForm] = useState({ subsidyId: '', capacityKw: '', location: '' });
  const [listForm, setListForm] = useState({ kwh: '24', price: '0.0180' });
  const [simListings, setSimListings] = useState(() => getSimListings());
  const [activity, setActivity] = useState(['Smart meter stream online', 'Feeder profile matched with subsidy registry']);

  const loadProfile = useCallback(async () => {
    if (!contract || !isWalletConnected) {
      setProfile(null);
      return;
    }
    try {
      const p = await contract.getProsumer(account);
      setProfile({
        subsidyID: p.subsidyID,
        panelCapacity: Number(p.panelCapacity),
        location: p.location,
        pendingApproval: p.pendingApproval,
        registered: p.registered,
        trustScore: Number(p.trustScore),
        totalEnergyGenerated: Number(p.totalEnergyGenerated),
        carbonCredits: Number(p.carbonCredits),
      });
    } catch (e) {
      console.error(e);
    }
  }, [contract, account, isWalletConnected]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => {
    const timer = setInterval(() => setLiveReading(generateReading()), 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => onSimulationChange(() => setSimListings(getSimListings())), []);

  const activeSimListings = simListings.filter((item) => item.active && item.seller === demoProsumer.address);
  const operationalProfile = profile?.registered ? {
    subsidyID: profile.subsidyID,
    location: profile.location,
    capacityKw: (profile.panelCapacity / 1000).toFixed(1),
    trustScore: profile.trustScore,
    generated: profile.totalEnergyGenerated,
    credits: profile.carbonCredits,
    source: 'On-chain',
  } : {
    subsidyID: demoProsumer.subsidyID,
    location: demoProsumer.location,
    capacityKw: demoProsumer.capacityKw,
    trustScore: demoProsumer.trustScore,
    generated: demoProsumer.generated,
    credits: demoProsumer.credits,
    source: 'Simulated',
  };
  const maxDailyKwh = Math.floor(Number(operationalProfile.capacityKw) * 24);

  const pushActivity = (message) => setActivity((current) => [message, ...current].slice(0, 6));

  const handleRegister = async (e) => {
    e.preventDefault();
    const capacityW = Math.round(parseFloat(form.capacityKw) * 1000);
    if (!contract || !form.subsidyId || !capacityW || !form.location) return;
    const ok = await run(() => contract.registerProsumer(form.subsidyId, capacityW, form.location), 'Registration submitted - awaiting government approval.');
    if (ok) {
      setForm({ subsidyId: '', capacityKw: '', location: '' });
      await loadProfile();
    }
  };

  const handleLogReading = async () => {
    const kwh = Math.max(1, Math.round(liveReading.kWh));
    if (!profile?.registered || !contract) {
      pushActivity(`Simulated ${kwh} kWh meter reading accepted for ${demoProsumer.meterId}`);
      return;
    }
    const ok = await run(() => contract.logEnergyGeneration(kwh), 'Logged ' + kwh + ' kWh on-chain - trust score and carbon credits updated.');
    if (ok) await loadProfile();
  };

  const handleList = async (e) => {
    e.preventDefault();
    const kwh = parseInt(listForm.kwh, 10);
    if (!kwh || !listForm.price) return;

    if (!profile?.registered || !contract) {
      const listing = addSimListing({ kWh: kwh, priceDisplay: Number(listForm.price).toFixed(4) });
      pushActivity(`${listing.kWh} kWh listed in simulated marketplace from ${listing.meterId}`);
      setSimListings(getSimListings());
      setListForm({ kwh: '24', price: '0.0180' });
      return;
    }

    const ok = await run(() => contract.listEnergy(kwh, ethers.parseEther(listForm.price)), 'Energy listed on the marketplace.');
    if (ok) {
      setListForm({ kwh: '24', price: '0.0180' });
      pushActivity(`${kwh} kWh listed on-chain through MetaMask`);
    }
  };

  return (
    <div className="App">
      <Navbar links={[{ label: 'Marketplace', to: '/buyer' }, { label: 'Govt', to: '/govt' }]} />
      <main className="role-console">
        <section className="role-hero">
          <div>
            <p className="eyebrow">Prosumer operations</p>
            <h2>Meter, credits, and surplus listing</h2>
            <p className="dashboard-sub">This account is correlated with the government monitor and buyer marketplace. MetaMask is used for live-chain registration, meter logging, and listing.</p>
          </div>
          <div className="wallet-status">
            <span className={'connection-dot ' + (isWalletConnected ? 'online' : 'offline')}></span>
            <div>
              <strong>{isWalletConnected ? account.slice(0, 6) + '...' + account.slice(-4) : 'Simulated profile active'}</strong>
              <span>{isWalletConnected ? `MetaMask on ${chain?.chainName || 'configured network'}` : 'Connect wallet for blockchain transactions'}</span>
            </div>
            {!isWalletConnected && <button className="connect-btn" onClick={connectWallet} disabled={connecting}>{connecting ? 'Connecting...' : 'Connect MetaMask'}</button>}
          </div>
        </section>

        {isWalletConnected && profile && !profile.registered && (
          <section className="panel-form">
            <h3>Register this wallet as a prosumer</h3>
            {profile.pendingApproval ? <p className="status-pill pending">Awaiting government approval</p> : (
              <form onSubmit={handleRegister} className="form-row">
                <input className="form-input" placeholder="Subsidy ID" value={form.subsidyId} onChange={(e) => setForm({ ...form, subsidyId: e.target.value })} />
                <input className="form-input" type="number" step="0.1" min="0.1" placeholder="Panel capacity (kW)" value={form.capacityKw} onChange={(e) => setForm({ ...form, capacityKw: e.target.value })} />
                <input className="form-input" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                <button type="submit" className="connect-btn" disabled={pending}>{pending ? 'Confirming...' : 'Register via MetaMask'}</button>
              </form>
            )}
          </section>
        )}

        <section className="ops-strip">
          <Metric label="Profile Source" value={operationalProfile.source} />
          <Metric label="Trust Score" value={`${operationalProfile.trustScore}/100`} tone="good" />
          <Metric label="Generated" value={`${operationalProfile.generated.toLocaleString('en-IN')} kWh`} />
          <Metric label="Carbon Credits" value={operationalProfile.credits.toLocaleString('en-IN')} tone="good" />
          <Metric label="Active Listings" value={activeSimListings.length} />
        </section>

        <section className="prosumer-grid">
          <div className="live-card compact-live">
            <div>
              <div className="live-tag"><span className="live-dot"></span> Live smart meter</div>
              <div className="live-value">{liveReading.kWh} kWh</div>
              <div className="live-meta">{demoProsumer.meterId} - {liveReading.voltage}V - {new Date(liveReading.timestamp).toLocaleTimeString()}</div>
            </div>
            <button className="buy-btn" onClick={handleLogReading} disabled={pending}>{profile?.registered ? (pending ? 'Confirming...' : 'Log via MetaMask') : 'Simulate Reading'}</button>
          </div>

          <div className="panel-form listing-panel">
            <h3>List surplus energy</h3>
            <p className="dashboard-sub">Max plausible daily generation: {maxDailyKwh} kWh for a {operationalProfile.capacityKw} kW system.</p>
            <form onSubmit={handleList} className="form-row">
              <input className="form-input" type="number" min="1" max={maxDailyKwh} value={listForm.kwh} onChange={(e) => setListForm({ ...listForm, kwh: e.target.value })} />
              <input className="form-input" type="number" step="0.0001" min="0" value={listForm.price} onChange={(e) => setListForm({ ...listForm, price: e.target.value })} />
              <button type="submit" className="connect-btn" disabled={pending}>{profile?.registered ? (pending ? 'Confirming...' : 'List via MetaMask') : 'List Simulated'}</button>
            </form>
          </div>
        </section>

        <section className="govt-workbench prosumer-workbench">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Listing</th><th>Meter</th><th>Energy</th><th>Price / kWh</th><th>Status</th></tr></thead>
              <tbody>
                {simListings.filter((item) => item.seller === demoProsumer.address).map((item) => (
                  <tr key={item.id}><td>{item.id}</td><td>{item.meterId}</td><td><strong>{item.kWh} kWh</strong></td><td>{item.priceDisplay}</td><td><span className={'status-pill ' + (item.active ? 'active' : 'pending')}>{item.active ? 'Marketplace' : 'Settled'}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="event-feed">
            <h3>Prosumer audit trail</h3>
            {activity.map((event, index) => <p key={event + index}><span>{index === 0 ? 'Now' : `${index * 2}m`}</span>{event}</p>)}
            <p><span>Go</span><Link to="/buyer">Open marketplace</Link></p>
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
