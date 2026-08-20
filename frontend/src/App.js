import React, { useState, useEffect } from 'react';
import './App.css';
import { generateReading } from './MeterSimulator';
import { getForecast } from './Forecast';

function App() {
  const [view, setView] = useState('prosumer');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [liveReading, setLiveReading] = useState(null);
  const [forecast, setForecast] = useState(null);

  const [listKwh, setListKwh] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [listings, setListings] = useState([
    { id: 1, seller: 'Ramesh Kumar', location: 'Bhopal, MP', kWh: 10, price: 6, trustScore: 88 },
    { id: 2, seller: 'Priya Sharma', location: 'Jabalpur, MP', kWh: 7, price: 5.5, trustScore: 95 },
    { id: 3, seller: 'Meena Joshi', location: 'Sagar, MP', kWh: 12, price: 6.2, trustScore: 85 },
  ]);
  const [purchaseMsg, setPurchaseMsg] = useState('');

  const prosumerData = {
    trustScore: 85,
    totalGenerated: 342,
    carbonCredits: 342,
    todayGeneration: 15.2,
  };

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
    const interval = setInterval(() => {
      setLiveReading(generateReading());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setForecast(getForecast());
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        setWalletAddress(accounts[0]);
        setWalletConnected(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      alert('MetaMask install karo pehle!');
    }
  };

  const handleListEnergy = (e) => {
    e.preventDefault();
    if (!listKwh || !listPrice) return;

    const newListing = {
      id: listings.length + 1,
      seller: 'You (Ramesh Kumar)',
      location: 'Bhopal, MP',
      kWh: parseFloat(listKwh),
      price: parseFloat(listPrice),
      trustScore: prosumerData.trustScore,
    };

    setListings([...listings, newListing]);
    setListKwh('');
    setListPrice('');
  };

  const handleBuy = (listing) => {
    setListings(listings.filter((l) => l.id !== listing.id));
    setPurchaseMsg(
      `✅ Purchased ${listing.kWh} kWh from ${listing.seller} for ₹${(listing.kWh * listing.price).toFixed(2)}. Payment auto-settled via smart contract.`
    );
    setTimeout(() => setPurchaseMsg(''), 5000);
  };

  return (
    <div className="App">
      <header style={styles.header}>
        <h1 style={styles.title}>☀️ SolarSettle</h1>
        <div>
          <button style={styles.navBtn} onClick={() => setView('prosumer')}>
            Prosumer Dashboard
          </button>
          <button style={styles.navBtn} onClick={() => setView('marketplace')}>
            Marketplace
          </button>
          <button style={styles.navBtn} onClick={() => setView('government')}>
            Government Dashboard
          </button>
          {!walletConnected ? (
            <button style={styles.connectBtn} onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <span style={styles.walletText}>
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          )}
        </div>
      </header>

      {view === 'prosumer' && (
        <div style={styles.dashboard}>
          <h2>Prosumer Dashboard</h2>

          {liveReading && (
            <div style={{ ...styles.card, backgroundColor: '#e8f5e9', marginBottom: '20px' }}>
              <h3>🔴 Live Meter Reading</h3>
              <p style={styles.bigNumber}>{liveReading.kWh} kWh</p>
              <p>
                Voltage: {liveReading.voltage}V |{' '}
                {new Date(liveReading.timestamp).toLocaleTimeString()}
              </p>
            </div>
          )}

          {forecast && (
            <div style={{ ...styles.card, backgroundColor: '#e3f2fd', marginBottom: '20px' }}>
              <h3>🤖 AI Forecast — Tomorrow</h3>
              <p style={styles.bigNumber}>{forecast.totalDailyForecast} kWh</p>
              <p>
                Predicted peak: {forecast.predictedPeakGeneration} kWh at{' '}
                {forecast.predictedPeakTime} | Confidence: {forecast.confidence}%
              </p>
            </div>
          )}

          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <h3>Trust Score</h3>
              <p style={styles.bigNumber}>{prosumerData.trustScore}/100</p>
            </div>
            <div style={styles.card}>
              <h3>Total Generated</h3>
              <p style={styles.bigNumber}>{prosumerData.totalGenerated} kWh</p>
            </div>
            <div style={styles.card}>
              <h3>Carbon Credits</h3>
              <p style={styles.bigNumber}>{prosumerData.carbonCredits}</p>
            </div>
            <div style={styles.card}>
              <h3>Today's Generation</h3>
              <p style={styles.bigNumber}>{prosumerData.todayGeneration} kWh</p>
            </div>
          </div>

          <div style={{ ...styles.card, marginTop: '30px', textAlign: 'left' }}>
            <h3>💡 List Your Excess Energy</h3>
            <form onSubmit={handleListEnergy} style={styles.form}>
              <input
                type="number"
                step="0.1"
                placeholder="kWh to sell"
                value={listKwh}
                onChange={(e) => setListKwh(e.target.value)}
                style={styles.input}
              />
              <input
                type="number"
                step="0.1"
                placeholder="Price per unit (₹)"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                style={styles.input}
              />
              <button type="submit" style={styles.connectBtn}>
                List on Marketplace
              </button>
            </form>
          </div>
        </div>
      )}

      {view === 'marketplace' && (
        <div style={styles.dashboard}>
          <h2>⚡ Energy Marketplace</h2>
          <p style={{ color: '#666' }}>Buy excess solar energy directly from local prosumers — instantly settled via smart contract.</p>

          {purchaseMsg && (
            <div style={{ ...styles.card, backgroundColor: '#e8f5e9', marginBottom: '20px', textAlign: 'left' }}>
              {purchaseMsg}
            </div>
          )}

          <div style={styles.panelGrid}>
            {listings.length === 0 && <p>No active listings right now.</p>}
            {listings.map((l) => (
              <div key={l.id} style={styles.panelCard}>
                <div style={styles.panelHeader}>
                  <strong>{l.seller}</strong>
                  <span style={{ color: '#4caf50', fontWeight: 'bold' }}>Trust: {l.trustScore}/100</span>
                </div>
                <p style={{ margin: '4px 0', color: '#666' }}>📍 {l.location}</p>
                <p style={{ margin: '4px 0' }}>
                  <strong>{l.kWh} kWh</strong> available
                </p>
                <p style={{ margin: '4px 0' }}>₹{l.price}/unit — Total: ₹{(l.kWh * l.price).toFixed(2)}</p>
                <button style={{ ...styles.connectBtn, width: '100%', marginTop: '10px' }} onClick={() => handleBuy(l)}>
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'government' && (
        <div style={styles.dashboard}>
          <h2>Government Dashboard</h2>

          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <h3>Total Panels Monitored</h3>
              <p style={styles.bigNumber}>{panels.length}</p>
            </div>
            <div style={styles.card}>
              <h3>Today's Total Generation</h3>
              <p style={styles.bigNumber}>{totalGenerationToday} kWh</p>
            </div>
            <div style={styles.card}>
              <h3>Avg Trust Score</h3>
              <p style={styles.bigNumber}>{avgTrustScore}/100</p>
            </div>
            <div style={{ ...styles.card, backgroundColor: fraudAlerts.length > 0 ? '#ffebee' : '#f4f4f4' }}>
              <h3>Fraud Alerts</h3>
              <p style={{ ...styles.bigNumber, color: fraudAlerts.length > 0 ? '#c62828' : '#1a1a2e' }}>
                {fraudAlerts.length}
              </p>
            </div>
          </div>

          {fraudAlerts.length > 0 && (
            <div style={styles.fraudBanner}>
              <h3 style={{ margin: '0 0 10px 0' }}>⚠️ Fraud Alerts — Immediate Attention Needed</h3>
              {fraudAlerts.map((p) => (
                <p key={p.id} style={{ margin: '4px 0' }}>
                  Panel <strong>{p.id}</strong> ({p.owner}, {p.location}) — <strong>0 kWh generated</strong> for 10+ days. Trust score dropped to {p.trustScore}/100.
                </p>
              ))}
            </div>
          )}

          <h3 style={{ marginTop: '30px' }}>📍 Subsidized Panels — Location Overview</h3>
          <div style={styles.panelGrid}>
            {panels.map((p) => (
              <div
                key={p.id}
                style={{
                  ...styles.panelCard,
                  borderLeft: p.status === 'fraud_alert' ? '5px solid #c62828' : '5px solid #4caf50',
                }}
              >
                <div style={styles.panelHeader}>
                  <strong>{p.id}</strong>
                  <span style={{ color: p.status === 'fraud_alert' ? '#c62828' : '#4caf50', fontWeight: 'bold' }}>
                    {p.status === 'fraud_alert' ? '⚠️ Alert' : '● Active'}
                  </span>
                </div>
                <p style={{ margin: '4px 0' }}>{p.owner}</p>
                <p style={{ margin: '4px 0', color: '#666' }}>📍 {p.location}</p>
                <p style={{ margin: '4px 0' }}>Today: <strong>{p.kWhToday} kWh</strong></p>
                <p style={{ margin: '4px 0' }}>Trust Score: <strong>{p.trustScore}/100</strong></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: '#1a1a2e',
    color: 'white',
  },
  title: {
    margin: 0,
  },
  navBtn: {
    margin: '0 8px',
    padding: '10px 16px',
    backgroundColor: '#16213e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  connectBtn: {
    margin: '0 8px',
    padding: '10px 16px',
    backgroundColor: '#f5a623',
    color: 'black',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  walletText: {
    marginLeft: '10px',
    color: '#4caf50',
    fontWeight: 'bold',
  },
  dashboard: {
    padding: '40px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  card: {
    backgroundColor: '#f4f4f4',
    padding: '24px',
    borderRadius: '12px',
    textAlign: 'center',
  },
  bigNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  fraudBanner: {
    backgroundColor: '#fff3e0',
    border: '2px solid #f57c00',
    borderRadius: '10px',
    padding: '16px 20px',
    marginTop: '20px',
  },
  panelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginTop: '16px',
  },
  panelCard: {
    backgroundColor: '#fafafa',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'left',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  form: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  input: {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    flex: '1',
    minWidth: '150px',
  },
};

export default App;