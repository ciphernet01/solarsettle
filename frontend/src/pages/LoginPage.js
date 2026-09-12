import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3, ROLE_HOME } from '../context/Web3Context';
import Navbar from '../components/Navbar';
import './LoginPage.css';

const ROLES = [
  {
    key: 'government',
    icon: '🏛️',
    name: 'Government / DISCOM',
    desc: 'Approve prosumer registrations, monitor generation data, flag fraud.',
    color: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
  },
  {
    key: 'prosumer',
    icon: '🌞',
    name: 'Prosumer',
    desc: 'Log energy readings, build trust score, list surplus energy for sale.',
    color: 'linear-gradient(135deg, #b45309, #f59e0b)',
  },
  {
    key: 'buyer',
    icon: '⚡',
    name: 'Buyer',
    desc: 'Browse the marketplace, buy energy, settle instantly on-chain.',
    color: 'linear-gradient(135deg, #16a34a, #12833d)',
  },
];

export default function LoginPage() {
  const { selectedRole, loginAs } = useWeb3();
  const navigate = useNavigate();

  // If already logged in, go to the right dashboard.
  React.useEffect(() => {
    if (selectedRole && ROLE_HOME[selectedRole]) {
      navigate(ROLE_HOME[selectedRole], { replace: true });
    }
  }, [selectedRole, navigate]);

  const handleSelect = (role) => {
    loginAs(role);
    navigate(ROLE_HOME[role], { replace: true });
  };

  return (
    <div className="App">
      <Navbar links={[]} />
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-sun">☀️</div>
          <h2>Sign in to SolarSettle</h2>
          <p className="login-sub">Choose your role. Connect MetaMask later from inside the dashboard.</p>

          <div role-grid>
            {ROLES.map((r) => (
              <button
                key={r.key}
                className="role-card"
                style={{ background: r.color }}
                onClick={() => handleSelect(r.key)}
              >
                <span className="role-card-icon">{r.icon}</span>
                <span className="role-card-name">{r.name}</span>
                <span className="role-card-desc">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
