import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useWeb3, ROLE_HOME } from '../context/Web3Context';
import Navbar from '../components/Navbar';
import './LoginPage.css';

const ROLE_CARDS = [
  {
    icon: '🏛️',
    name: 'Government / DISCOM',
    desc: 'The contract owner. Approves prosumer registrations, monitors generation, flags fraud.',
    how: 'Sign in from the wallet that deployed the contract.',
  },
  {
    icon: '🌞',
    name: 'Prosumer',
    desc: 'A subsidized panel owner. Logs verified readings, earns trust and carbon credits, sells surplus energy.',
    how: 'Register as a prosumer; once the government approves your panel, you land here.',
  },
  {
    icon: '⚡',
    name: 'Buyer',
    desc: 'Anyone else. Browse the marketplace, buy energy, settle instantly through the contract.',
    how: 'Any wallet that is not the owner or an approved prosumer is a buyer.',
  },
];

export default function LoginPage() {
  const { account, role, connecting, error, connect, configured } = useWeb3();
  const location = useLocation();
  const navigate = useNavigate();

  // Already signed in? Go straight to the right dashboard.
  useEffect(() => {
    if (account && role && ROLE_HOME[role]) {
      const from = location.state?.from;
      navigate(from && from !== '/login' ? from : ROLE_HOME[role], { replace: true });
    }
  }, [account, role, location.state, navigate]);

  const handleConnect = async () => {
    await connect(); // navigation happens in the effect once role resolves
  };

  if (account && role && ROLE_HOME[role]) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  return (
    <div className="App">
      <Navbar links={[]} />
      <div className="login-wrap">
        {!configured && (
          <div className="setup-banner" style={{ margin: '0 0 18px 0', maxWidth: '560px' }}>
            The smart contract isn't deployed yet. From the project root run
            <code> npm run deploy:local</code> (or a testnet deploy), then reload this page.
          </div>
        )}
        <div className="login-card">
          <div className="login-sun">☀️</div>
          <h2>Sign in to SolarSettle</h2>
          <p className="login-sub">
            One login, three experiences. Connect your wallet — your role is resolved
            <strong> on-chain</strong>, from the smart contract, not from a password database.
          </p>

          <button className="connect-btn login-btn" onClick={handleConnect} disabled={connecting}>
            {connecting ? (
              <>
                <span className="spinner" /> Resolving your role…
              </>
            ) : (
              '🦊 Connect MetaMask'
            )}
          </button>

          {error && <p className="login-error">⚠ {error}</p>}

          <div className="login-roles">
            {ROLE_CARDS.map((r) => (
              <div className="role-row" key={r.name}>
                <div className="role-row-head">
                  <span className="role-icon">{r.icon}</span>
                  <span className="role-name">{r.name}</span>
                </div>
                <p className="role-desc">{r.desc}</p>
                <p className="role-how">{r.how}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
