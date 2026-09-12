import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3, ROLE_HOME } from '../context/Web3Context';
import Navbar from '../components/Navbar';
import './LoginPage.css';

const ROLES = [
  {
    key: 'government',
    name: 'Government / DISCOM',
    desc: 'Approve registrations, monitor meter risk, and enforce penalties.',
    color: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
  },
  {
    key: 'prosumer',
    name: 'Prosumer',
    desc: 'Register panels, log verified readings, and list surplus energy.',
    color: 'linear-gradient(135deg, #b45309, #f59e0b)',
  },
  {
    key: 'buyer',
    name: 'Buyer',
    desc: 'Browse the marketplace and settle purchases through MetaMask.',
    color: 'linear-gradient(135deg, #16a34a, #12833d)',
  },
];

export default function LoginPage() {
  const { selectedRole, loginAs } = useWeb3();
  const navigate = useNavigate();

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
          <div className="login-sun">SS</div>
          <h2>Sign in to SolarSettle</h2>
          <p className="login-sub">Choose the operating role. MetaMask connects inside each dashboard when a blockchain action is needed.</p>

          <div className="role-grid">
            {ROLES.map((r) => (
              <button
                key={r.key}
                className="role-card"
                style={{ background: r.color }}
                onClick={() => handleSelect(r.key)}
              >
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
