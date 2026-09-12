import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';

/**
 * Shared top navigation. `links` is an array of { label, to } — the active
 * link is highlighted based on the current route.
 */
export default function Navbar({ links = [] }) {
  const { account, connecting, connect, disconnect, error, setError } = useWeb3();
  const location = useLocation();
  const navigate = useNavigate();

  const handleConnect = async () => {
    const result = await connect();
    if (result) navigate('/login');
  };

  const short = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <header className="header">
      <Link to="/" style={{ textDecoration: 'none' }}>
        <h1 className="brand">
          <span className="brand-icon">☀️</span>
          <span className="brand-text">SolarSettle</span>
        </h1>
      </Link>
      <nav className="nav">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className={`nav-btn ${location.pathname === l.to ? 'active' : ''}`}>
            {l.label}
          </Link>
        ))}
        {!account ? (
          <button className="connect-btn" onClick={handleConnect} disabled={connecting}>
            {connecting ? 'Signing in…' : 'Login'}
          </button>
        ) : (
          <>
            <span className="wallet-pill" title={account}>
              <span className="wallet-dot"></span>
              {short(account)}
            </span>
            <button
              className="nav-btn"
              onClick={() => {
                disconnect();
                setError('');
              }}
            >
              Logout
            </button>
          </>
        )}
      </nav>
      {error && (
        <div className="nav-error" role="alert" onClick={() => setError('')}>
          ⚠ {error}
        </div>
      )}
    </header>
  );
}
