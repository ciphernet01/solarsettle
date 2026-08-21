import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import { generateReading } from './MeterSimulator';
import { getForecast } from './Forecast';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contractConfig';
import TiltCard from './TiltCard';

function App() {
  const [view, setView] = useState('prosumer');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [liveReading, setLiveReading] = useState(null);
  const [forecast, setForecast] = useState(null);

  const [contract, setContract] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [onChainData, setOnChainData] = useState(null);
  const [txStatus, setTxStatus] = useState('');
  const [txPending, setTxPending] = useState(false);

  const [listKwh, setListKwh] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [listings, setListings] = useState([]);

  const [showIntro, setShowIntro] = useState(true);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const panels = [
    { id: 'MP-001', owner: 'Ramesh Kumar', location: 'Bhopal, MP', kWhToday: 18.4, status: 'active', trustScore: 88 },
    { id: 'MP-002', owner: 'Sunita Verma', location: 'Indore, MP', kWhToday: 15.1, status: 'active', trustScore: 92 },
    { id: 'MP-003', owner: 'Anil Patel', location: 'Gwalior, MP', kWhToday: 0, status: 'fraud_alert', trustScore: 12 },
    { id: 'MP-004', owner: 'Priya Sharma', location: 'Jabalpur, MP', kWhToday: 19.7, status: 'active', trustScore: 95 },
    { id: 'MP-005', owner: 'Vikram Singh', location: 'Ujjain, MP', kWhToday: 14.3, status: 'active', trustScore: 79 },
    { id: 'MP-006', owner: 'Meena Joshi', location: 'Sagar, MP', kWhToday: 16.8, status: 'active', trustScore: 85 },
  ];

  const fraudAlerts = panels.filter((p) => p.status === 'fraud_alert');
  const totalGenerationToday = panels.reduce((sum, p) => sum + p.kWhToday, 0).toFixed(1);
  const avgTrustScore = (panels.reduce((sum, p) => sum + p.trustScore, 0) / panels.length).toFixed(0);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveReading(generateReading());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setForecast(getForecast());
  }, []);

  const handleSceneMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 30;
    const y = (e.clientY / window.innerHeight - 0.5) * 30;
    setParallax({ x, y });
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask install karo pehle!');
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setWalletAddress(accounts[0]);
      setWalletConnected(true);
      setContract(contractInstance);

      await loadProsumerData(contractInstance, accounts[0]);
      await loadListings(contractInstance);
    } catch (err) {
      console.error(err);
      setTxStatus('❌ Wallet connect failed: ' + err.message);
    }
  };

  const loadProsumerData = async (contractInstance, address) => {
    try {
      const p = await contractInstance.prosumers(address);
      setIsRegistered(p.registered);
      setOnChainData({
        subsidyID: p.subsidyID,
        panelCapacity: Number(p.panelCapacity),
        location: p.location,
        trustScore: Number(p.trustScore),
        totalEnergyGenerated: Number(p.totalEnergyGenerated),
        carbonCredits: Number(p.carbonCredits),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const loadListings = async (contractInstance) => {
    try {
      const count = await contractInstance.listingCount();
      const arr = [];
      for (let i = 0; i < Number(count); i++) {
        const l = await contractInstance.listings(i);
        if (l.active) {
          arr.push({
            id: i,
            seller: l.seller,
            kWh: Number(l.kWh),
            pricePerUnit: l.pricePerUnit,
            priceDisplay: ethers.formatEther(l.pricePerUnit),
          });
        }
      }
      setListings(arr);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async () => {
    if (!contract) return;
    setTxPending(true);
    setTxStatus('⏳ Registering on blockchain... confirm in MetaMask');
    try {
      const tx = await contract.registerProsumer('PMKUSUM-DEMO-001', 5000, 'Bhopal, MP');
      await tx.wait();
      setTxStatus('✅ Registered successfully on-chain!');
      await loadProsumerData(contract, walletAddress);
    } catch (err) {
      console.error(err);
      setTxStatus('❌ Registration failed: ' + (err.reason || err.message));
    }
    setTxPending(false);
  };

  const handleLogReading = async () => {
    if (!contract || !liveReading) return;
    setTxPending(true);
    setTxStatus('⏳ Logging energy reading to blockchain... confirm in MetaMask');
    try {
      const kWhInt = Math.max(1, Math.round(liveReading.kWh));
      const tx = await contract.logEnergyGeneration(kWhInt);
      await tx.wait();
      setTxStatus(`✅ Logged ${kWhInt} kWh on-chain! Trust score & carbon credits updated.`);
      await loadProsumerData(contract, walletAddress);
    } catch (err) {
      console.error(err);
      setTxStatus('❌ Logging failed: ' + (err.reason || err.message));
    }
    setTxPending(false);
  };

  const handleListEnergy = async (e) => {
    e.preventDefault();
    if (!contract || !listKwh || !listPrice) return;
    setTxPending(true);
    setTxStatus('⏳ Listing energy on blockchain... confirm in MetaMask');
    try {
      const kWhInt = parseInt(listKwh, 10);
      const priceWei = ethers.parseEther(listPrice);
      const tx = await contract.listEnergy(kWhInt, priceWei);
      await tx.wait();
      setTxStatus('✅ Listed on marketplace on-chain!');
      setListKwh('');
      setListPrice('');
      await loadListings(contract);
    } catch (err) {
      console.error(err);
      setTxStatus('❌ Listing failed: ' + (err.reason || err.message));
    }
    setTxPending(false);
  };

  const handleBuy = async (listing) => {
    if (!contract) return;
    setTxPending(true);
    setTxStatus('⏳ Buying energy... confirm in MetaMask');
    try {
      const totalValue = BigInt(listing.kWh) * BigInt(listing.pricePerUnit);
      const tx = await contract.buyEnergy(listing.id, { value: totalValue });
      await tx.wait();
      setTxStatus(`✅ Purchased ${listing.kWh} kWh from ${listing.seller.slice(0, 6)}...! Payment auto-settled on-chain.`);
      await loadListings(contract);
    } catch (err) {
      console.error(err);
      setTxStatus('❌ Purchase failed: ' + (err.reason || err.message));
    }
    setTxPending(false);
  };

  return (
    <div className="App scene" onMouseMove={handleSceneMouseMove}>
      {showIntro && (
        <div className="intro-splash">
          <div className="intro-sun">
            <div className="intro-ring r1"></div>
            <div className="intro-ring r2"></div>
            <div className="intro-ring r3"></div>
          </div>
          <div className="intro-title">☀️ SolarSettle</div>
        </div>
      )}

      <div className="bg-orb orb-1" style={{ transform: `translate(${parallax.x}px, ${parallax.y}px)` }}></div>
      <div className="bg-orb orb-2" style={{ transform: `translate(${-parallax.x}px, ${-parallax.y}px)` }}></div>
      <div className="bg-orb orb-3" style={{ transform: `translate(${parallax.x * 0.5}px, ${-parallax.y * 0.5}px)` }}></div>
      <div className="grid-floor-wrap">
        <div className="grid-floor"></div>
      </div>

      <header className="header">
        <h1 className="brand">
          <span className="brand-icon">☀️</span>
          <span className="brand-text">SolarSettle</span>
        </h1>
        <nav className="nav">
          <button className={`nav-btn ${view === 'prosumer' ? 'active' : ''}`} onClick={() => setView('prosumer')}>
            Prosumer
          </button>
          <button className={`nav-btn ${view === 'marketplace' ? 'active' : ''}`} onClick={() => setView('marketplace')}>
            Marketplace
          </button>
          <button className={`nav-btn ${view === 'government' ? 'active' : ''}`} onClick={() => setView('government')}>
            Government
          </button>
          {!walletConnected ? (
            <button className="connect-btn" onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <span className="wallet-pill">
              <span className="wallet-dot"></span>
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          )}
        </nav>
      </header>

      {txStatus && (
        <div className="purchase-toast" style={{ margin: '16px 40px 0 40px' }}>
          {txStatus}
        </div>
      )}

      {view === 'prosumer' && (
        <div className="dashboard">
          <h2>Prosumer Dashboard</h2>
          <p className="dashboard-sub">Live generation, forecasts, and your real on-chain reputation.</p>

          {!walletConnected && (
            <div className="panel-form">
              <h3>🔌 Connect your wallet to interact with the live contract</h3>
              <p className="dashboard-sub">All actions below (register, log readings, list energy) are real blockchain transactions on Polygon Amoy testnet.</p>
            </div>
          )}

          {walletConnected && !isRegistered && (
            <div className="panel-form">
              <h3>📝 Register as a Prosumer (on-chain)</h3>
              <p className="dashboard-sub">This writes your subsidy ID and panel details to the smart contract.</p>
              <button className="connect-btn" onClick={handleRegister} disabled={txPending}>
                {txPending ? 'Confirming...' : 'Register on Blockchain'}
              </button>
            </div>
          )}

          {liveReading && (
            <div className="live-card">
              <div>
                <div className="live-tag">
                  <span className="live-dot"></span> Live Meter Reading
                </div>
                <div className="live-value">{liveReading.kWh} kWh</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="live-meta">
                  {liveReading.voltage}V &nbsp;·&nbsp; {new Date(liveReading.timestamp).toLocaleTimeString()}
                </div>
                {walletConnected && isRegistered && (
                  <button className="buy-btn" style={{ width: 'auto', margin: 0 }} onClick={handleLogReading} disabled={txPending}>
                    {txPending ? 'Confirming...' : 'Log to Blockchain'}
                  </button>
                )}
              </div>
            </div>
          )}

          {forecast && (
            <div className="forecast-card">
              <span className="forecast-tag">🤖 AI Forecast — Tomorrow</span>
              <div className="forecast-value">{forecast.totalDailyForecast} kWh</div>
              <div className="forecast-meta">
                Predicted peak: {forecast.predictedPeakGeneration} kWh at {forecast.predictedPeakTime} · Confidence {forecast.confidence}%
              </div>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${forecast.confidence}%` }}></div>
              </div>
            </div>
          )}

          <div className="card-grid">
            <TiltCard className="stat-card">
              <p className="stat-label">Trust Score (on-chain)</p>
              <div className="trust-ring-wrap">
                <div className="trust-ring" style={{ '--pct': onChainData ? onChainData.trustScore : 0 }}>
                  <div className="trust-ring-inner">{onChainData ? onChainData.trustScore : '—'}</div>
                </div>
                <span className="stat-value trust" style={{ fontSize: '18px' }}>/ 100</span>
              </div>
            </TiltCard>
            <TiltCard className="stat-card">
              <p className="stat-label">Total Generated (on-chain)</p>
              <p className="stat-value">{onChainData ? onChainData.totalEnergyGenerated : '—'} kWh</p>
            </TiltCard>
            <TiltCard className="stat-card">
              <p className="stat-label">Carbon Credits (on-chain)</p>
              <p className="stat-value solar">{onChainData ? onChainData.carbonCredits : '—'}</p>
            </TiltCard>
            <TiltCard className="stat-card">
              <p className="stat-label">Today's Generation</p>
              <p className="stat-value">{liveReading ? liveReading.kWh : '—'} kWh</p>
            </TiltCard>
          </div>

          {walletConnected && isRegistered && (
            <div className="panel-form">
              <h3>💡 List Your Excess Energy (on-chain)</h3>
              <form onSubmit={handleListEnergy} className="form-row">
                <input
                  type="number"
                  step="1"
                  placeholder="kWh to sell"
                  value={listKwh}
                  onChange={(e) => setListKwh(e.target.value)}
                  className="form-input"
                />
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Price per unit (POL)"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  className="form-input"
                />
                <button type="submit" className="connect-btn" disabled={txPending}>
                  {txPending ? 'Confirming...' : 'List on Marketplace'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {view === 'marketplace' && (
        <div className="dashboard">
          <h2>⚡ Energy Marketplace</h2>
          <p className="dashboard-sub">Live on-chain listings — buying settles instantly via smart contract.</p>

          <div className="panel-grid">
            {listings.length === 0 && (
              <p className="dashboard-sub">No active listings on-chain right now. Connect your wallet and list some energy!</p>
            )}
            {listings.map((l) => (
              <TiltCard key={l.id} className="panel-card">
                <div className="panel-card-header">
                  <strong className="panel-id">{l.seller.slice(0, 6)}...{l.seller.slice(-4)}</strong>
                  <span className="status-pill active">On-chain</span>
                </div>
                <p className="panel-row"><strong>{l.kWh} kWh</strong> available</p>
                <p className="panel-row">{l.priceDisplay} POL/unit · Total: <strong>{(l.kWh * parseFloat(l.priceDisplay)).toFixed(4)} POL</strong></p>
                <button className="buy-btn" onClick={() => handleBuy(l)} disabled={txPending || !walletConnected}>
                  {txPending ? 'Confirming...' : 'Buy Now'}
                </button>
              </TiltCard>
            ))}
          </div>
        </div>
      )}

      {view === 'government' && (
        <div className="dashboard">
          <h2>Government Dashboard</h2>
          <p className="dashboard-sub">Real-time subsidy verification across monitored panels.</p>

          <div className="card-grid">
            <TiltCard className="stat-card">
              <p className="stat-label">Total Panels Monitored</p>
              <p className="stat-value">{panels.length}</p>
            </TiltCard>
            <TiltCard className="stat-card">
              <p className="stat-label">Today's Total Generation</p>
              <p className="stat-value solar">{totalGenerationToday} kWh</p>
            </TiltCard>
            <TiltCard className="stat-card">
              <p className="stat-label">Avg Trust Score</p>
              <p className="stat-value trust">{avgTrustScore}/100</p>
            </TiltCard>
            <TiltCard className="stat-card">
              <p className="stat-label">Fraud Alerts</p>
              <p className="stat-value alert">{fraudAlerts.length}</p>
            </TiltCard>
          </div>

          {fraudAlerts.length > 0 && (
            <div className="fraud-banner">
              <h3>⚠️ Fraud Alerts — Immediate Attention Needed</h3>
              {fraudAlerts.map((p) => (
                <p key={p.id}>
                  Panel <strong>{p.id}</strong> ({p.owner}, {p.location}) — <strong>0 kWh generated</strong> for 10+ days. Trust score dropped to {p.trustScore}/100.
                </p>
              ))}
            </div>
          )}

          <h3 className="section-label">📍 Subsidized Panels — Location Overview</h3>
          <div className="panel-grid">
            {panels.map((p) => (
              <TiltCard key={p.id} className={`panel-card ${p.status === 'fraud_alert' ? 'alert' : ''}`}>
                <div className="panel-card-header">
                  <span className="panel-id">{p.id}</span>
                  <span className={`status-pill ${p.status === 'fraud_alert' ? 'alert' : 'active'}`}>
                    {p.status === 'fraud_alert' ? 'Alert' : 'Active'}
                  </span>
                </div>
                <p className="panel-row">{p.owner}</p>
                <p className="panel-row">📍 {p.location}</p>
                <p className="panel-row">Today: <strong>{p.kWhToday} kWh</strong></p>
                <p className="panel-row">Trust Score: <strong>{p.trustScore}/100</strong></p>
              </TiltCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;