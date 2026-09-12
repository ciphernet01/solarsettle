import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';

export default function Navbar({ links = [] }) {
  const { selectedRole, isWalletConnected, account, logout, error, setError } = useWeb3();
  const location = useLocation();

  const short = (a) => a ? (a.slice(0, 6) + '...' + a.slice(-4)) : '';
  const roleLabel = selectedRole === 'government' ? 'Govt' : selectedRole === 'prosumer' ? 'Prosumer' : 'Buyer';

  return (
    <header className="header">
      <Link to="/" style={{ textDecoration: 'none' }}>
        <h1 className="brand">
          <span className="brand-icon">SS</span>
          <span className="brand-text">SolarSettle</span>
        </h1>
      </Link>
      <nav className="nav">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className={'nav-btn ' + (location.pathname === l.to ? 'active' : '')}>
            {l.label}
          </Link>
        ))}
        {selectedRole && (
          <span className="wallet-pill" title={selectedRole}>
            <span className="wallet-dot"></span>
            {roleLabel}
          </span>
        )}
        {isWalletConnected && (
          <span className="wallet-pill" title={account}>
            <span className="wallet-dot"></span>
            {short(account)}
          </span>
        )}
        {selectedRole && (
          <button className="nav-btn" onClick={() => { logout(); setError(''); }}>
            Logout
          </button>
        )}
      </nav>
      {error && (
        <div className="nav-error" role="alert" onClick={() => setError('')}>
          {error}
        </div>
      )}
    </header>
  );
}
