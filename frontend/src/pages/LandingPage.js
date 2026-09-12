import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublicMarketData, setDeployedChainId } from '../lib/contractReads';
import deployed from '../deployedAddress.json';
import Navbar from '../components/Navbar';
import TiltCard from '../components/TiltCard';
import './LandingPage.css';

setDeployedChainId(deployed.chainId);

const FEATURES = [
  {
    icon: '🛡️',
    title: 'Fraud-Proof Subsidy Verification',
    text: 'Every meter reading is written immutably on-chain. Silent panels lose trust score automatically — subsidies follow real generation, not paperwork.',
  },
  {
    icon: '🤝',
    title: 'Trustless P2P Energy Trading',
    text: 'Prosumers list surplus kWh; buyers pay directly through the contract. Funds settle atomically with automatic refunds — no middleman.',
  },
  {
    icon: '🏅',
    title: 'On-Chain Trust Scores',
    text: 'Consistent, physically-plausible reporting builds reputation from 70 up to 100. Inactivity is penalized once per window, never infinitely.',
  },
  {
    icon: '🌱',
    title: 'Carbon Credit Ledger',
    text: 'Every verified kWh mints a carbon credit on the same ledger — an auditable, double-spend-proof incentive layer.',
  },
];

const STEPS = [
  { n: '01', title: 'Sign in with your wallet', text: 'Your role resolves on-chain automatically — no passwords, no accounts.' },
  { n: '02', title: 'Government approves your panel', text: 'Register with your subsidy ID; the DISCOM/government approves it on-chain.' },
  { n: '03', title: 'Log generation, earn trust', text: 'Readings build your trust score and mint carbon credits.' },
  { n: '04', title: 'Trade surplus energy', text: 'List surplus kWh; buyers settle instantly through the smart contract.' },
];

export default function LandingPage() {
  const [market, setMarket] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const data = await fetchPublicMarketData();
      if (!cancelled) setMarket(data);
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const fmt = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-IN'));
  const hasListings = market && market.listings.length > 0;

  return (
    <div className="App landing">
      <Navbar links={[{ label: 'Marketplace', to: '/#marketplace' }]} />

      <section className="hero">
        <div className="hero-inner">
          <span className="hero-badge">Built for India's PM-KUSUM &amp; rooftop solar programs</span>
          <h1 className="hero-title">
            Transparent settlement for <span className="grad">subsidized solar energy</span>
          </h1>
          <p className="hero-sub">
            SolarSettle verifies that subsidized panels actually generate power, scores prosumer
            trust on-chain, and settles peer-to-peer energy trades through a smart contract —
            integrating with DISCOM infrastructure, not bypassing it.
          </p>
          <div className="hero-cta-row">
            <Link to="/login" className="btn-primary-lg">Login →</Link>
            <a href="#marketplace" className="btn-ghost-lg">Browse the marketplace</a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value solar">{fmt(market?.totalKwh)}</span>
              <span className="hero-stat-label">kWh logged on-chain</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">{fmt(market?.registeredCount)}</span>
              <span className="hero-stat-label">Approved prosumers</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value trust">{fmt(market?.activeListings)}</span>
              <span className="hero-stat-label">Live energy listings</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="marketplace">
        <div className="section-head">
          <h2 className="section-title">⚡ Live Marketplace</h2>
          <p className="section-sub">
            {market
              ? 'Real listings, straight from the smart contract. Sign in to buy.'
              : 'Marketplace data is unavailable right now (contract may not be deployed on this network yet).'}
          </p>
        </div>
        {hasListings ? (
          <div className="panel-grid">
            {market.listings.map((l) => (
              <TiltCard key={l.id} className="panel-card">
                <div className="panel-card-header">
                  <strong className="panel-id">{l.seller.slice(0, 6)}...{l.seller.slice(-4)}</strong>
                  <span className="status-pill active">On-chain</span>
                </div>
                <p className="panel-row"><strong>{l.kWh} kWh</strong> available</p>
                <p className="panel-row">{l.priceDisplay} per unit · Total <strong>{(l.kWh * parseFloat(l.priceDisplay)).toFixed(4)}</strong></p>
                <Link to="/login" className="buy-btn" style={{ display: 'block', textAlign: 'center' }}>
                  Login to buy
                </Link>
              </TiltCard>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <p className="dashboard-sub" style={{ padding: '22px', margin: 0 }}>
              No active listings right now. Prosumers list surplus energy here — it appears on this page instantly.
            </p>
          </div>
        )}
      </section>

      <section className="landing-section">
        <div className="section-head">
          <h2 className="section-title">Why SolarSettle</h2>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-head">
          <h2 className="section-title">How it works</h2>
        </div>
        <div className="how-grid">
          {STEPS.map((s) => (
            <div className="how-card" key={s.n}>
              <span className="how-num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section cta-band">
        <h2>Ready to settle solar, transparently?</h2>
        <Link to="/login" className="btn-primary-lg">Login to your dashboard →</Link>
      </section>

      <footer className="footer">
        <span>☀️ SolarSettle — transparent energy settlement for India.</span>
      </footer>
    </div>
  );
}
