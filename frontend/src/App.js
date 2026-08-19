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

  const prosumerData = {
    trustScore: 85,
    totalGenerated: 342,
    carbonCredits: 342,
    todayGeneration: 15.2,
  };

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

  return (
    <div className="App">
      <header style={styles.header}>
        <h1 style={styles.title}>☀️ SolarSettle</h1>
        <div>
          <button style={styles.navBtn} onClick={() => setView('prosumer')}>
            Prosumer Dashboard
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

      {view === 'prosumer' ? (
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
        </div>
      ) : (
        <div style={styles.dashboard}>
          <h2>Government Dashboard</h2>
          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <h3>Total Panels Monitored</h3>
              <p style={styles.bigNumber}>50</p>
            </div>
            <div style={styles.card}>
              <h3>Today's Total Generation</h3>
              <p style={styles.bigNumber}>750 kWh</p>
            </div>
            <div style={styles.card}>
              <h3>Fraud Alerts</h3>
              <p style={styles.bigNumber}>1</p>
            </div>
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
};

export default App;