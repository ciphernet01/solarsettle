import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import Navbar from '../../components/Navbar';
import TiltCard from '../../components/TiltCard';
import useTx from '../../hooks/useTx';
import indiaMap from '@svg-maps/india';

const INACTIVITY_WINDOW_DAYS = 7;
const DAY_MS = 24 * 3600 * 1000;
const DEMO_PENDING = [
  { address: '0x7A1D00000000000000000000000000000000C101', subsidyID: 'PM-KUSUM-2026-0142', location: 'Bhopal, MP', capacityKw: '5.0' },
  { address: '0x7A1D00000000000000000000000000000000C102', subsidyID: 'ROOFTOP-2026-087', location: 'Indore, MP', capacityKw: '3.5' },
];
const DEMO_PROSUMERS = [
  { address: '0x7A1D00000000000000000000000000000000C201', subsidyID: 'PM-KUSUM-2025-031', location: 'Ujjain, MP', capacityKw: '8.0', trustScore: 96, generated: 8420, credits: 8420, lastReading: 'Today', daysSilent: 0, atRisk: false },
  { address: '0x7A1D00000000000000000000000000000000C202', subsidyID: 'ROOFTOP-2025-119', location: 'Bhopal, MP', capacityKw: '5.0', trustScore: 88, generated: 5210, credits: 5210, lastReading: 'Yesterday', daysSilent: 1, atRisk: false },
  { address: '0x7A1D00000000000000000000000000000000C203', subsidyID: 'PM-KUSUM-2024-072', location: 'Gwalior, MP', capacityKw: '10.0', trustScore: 34, generated: 6190, credits: 6190, lastReading: '9 days ago', daysSilent: 9, atRisk: true },
];

const CITY_POSITIONS = {
  Bhopal: { x: 270, y: 390 }, Indore: { x: 226, y: 410 }, Gwalior: { x: 267, y: 330 },
  Jabalpur: { x: 325, y: 385 }, Ujjain: { x: 220, y: 392 }, Sagar: { x: 295, y: 390 },
};

const STATE_NAMES = { MP: 'Madhya Pradesh', MH: 'Maharashtra', RJ: 'Rajasthan', GJ: 'Gujarat', UP: 'Uttar Pradesh', DL: 'Delhi', PB: 'Punjab', HR: 'Haryana', KA: 'Karnataka', TN: 'Tamil Nadu', WB: 'West Bengal', OD: 'Odisha', BR: 'Bihar', AP: 'Andhra Pradesh', TS: 'Telangana', KL: 'Kerala', JH: 'Jharkhand', CT: 'Chhattisgarh', UK: 'Uttarakhand', HP: 'Himachal Pradesh', JK: 'Jammu and Kashmir', AS: 'Assam' };

export default function GovtDashboard() {
  const { isWalletConnected, account, contract, connectWallet, connecting } = useWeb3();
  const { pending, toast, run, setToast } = useTx();
  const [stats, setStats] = useState(null);
  const [pendingList, setPendingList] = useState([]);
  const [prosumers, setProsumers] = useState([]);
  const [demoMode, setDemoMode] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState(DEMO_PROSUMERS[0].address);
  const [mapZoomed, setMapZoomed] = useState(false);

  const load = useCallback(async () => {
    if (!contract) {
      setStats({ totalKwh: 19820, totalListings: 17, activeListings: 6, registeredCount: 12 });
      setPendingList(DEMO_PENDING);
      setProsumers(DEMO_PROSUMERS);
      setDemoMode(true);
      return;
    }
    setDemoMode(false);
    try {
      const s = await contract.platformStats();
      setStats({
        totalKwh: Number(s[0]),
        totalListings: Number(s[1]),
        activeListings: Number(s[2]),
        registeredCount: Number(s[3]),
      });
      const pendingAddrs = await contract.pendingProsumers();
      const pendingRows = [];
      for (const addr of pendingAddrs) {
        const p = await contract.getProsumer(addr);
        pendingRows.push({ address: addr, subsidyID: p.subsidyID, location: p.location, capacityKw: (Number(p.panelCapacity) / 1000).toFixed(1) });
      }
      setPendingList(pendingRows);
      const regAddrs = await contract.registeredProsumers();
      const rows = [];
      for (const addr of regAddrs) {
        const p = await contract.getProsumer(addr);
        const last = Number(p.lastReadingTimestamp) * 1000;
        const daysSilent = Math.floor((Date.now() - last) / DAY_MS);
        rows.push({
          address: addr, subsidyID: p.subsidyID, location: p.location,
          capacityKw: (Number(p.panelCapacity) / 1000).toFixed(1),
          trustScore: Number(p.trustScore), generated: Number(p.totalEnergyGenerated),
          credits: Number(p.carbonCredits), lastReading: new Date(last).toLocaleDateString(),
          daysSilent, atRisk: daysSilent > INACTIVITY_WINDOW_DAYS || Number(p.trustScore) < 40,
        });
      }
      setProsumers(rows);
    } catch (e) { console.error(e); }
  }, [contract]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (addr) => {
    if (demoMode) {
      setPendingList((current) => current.filter((item) => item.address !== addr));
      setStats((current) => ({ ...current, registeredCount: current.registeredCount + 1 }));
      setToast({ kind: 'ok', text: 'Demo approval completed - sample prosumer moved into the registry.' });
      return;
    }
    const ok = await run(() => contract.approveProsumer(addr), 'Approved prosumer ' + addr.slice(0, 6) + '...');
    if (ok) await load();
  };

  const handleCheckInactivity = async (addr) => {
    if (demoMode) {
      setProsumers((current) => current.map((prosumer) => prosumer.address === addr
        ? { ...prosumer, trustScore: Math.max(0, prosumer.trustScore - 20), atRisk: true }
        : prosumer));
      setToast({ kind: 'ok', text: 'Demo inactivity penalty applied - trust score reduced by 20 points.' });
      return;
    }
    const ok = await run(() => contract.checkInactivity(addr), 'Inactivity check executed for ' + addr.slice(0, 6) + '...');
    if (ok) await load();
  };

  const short = (a) => a ? (a.slice(0, 6) + '...' + a.slice(-4)) : '';
  const mapConnections = useMemo(() => [
    ...prosumers.map((row) => ({ ...row, status: row.atRisk ? 'Fraud Risk' : 'Healthy', riskReason: row.atRisk ? `No meter reading inside the ${INACTIVITY_WINDOW_DAYS}-day window or trust below threshold` : 'Generation matches the expected operating profile', meterId: row.meterId || 'SIM-METER', feeder: row.feeder || 'LOCAL-FEED', lastKwh: row.lastKwh || 0, expectedKwh: row.expectedKwh || Math.round(Number(row.capacityKw) * 5) })),
    ...pendingList.map((row) => ({ ...row, status: 'Waiting', riskReason: 'Awaiting government registration approval', trustScore: null, meterId: 'Pending meter', feeder: 'Pending feeder', lastKwh: 0, expectedKwh: 0 })),
  ], [prosumers, pendingList]);

  return (
    <div className="App">
      <Navbar links={[{ label: 'Marketplace', to: '/buyer' }]} />
      <div className="dashboard">
        <h2>🏛️ Government Dashboard</h2>
        <p className="dashboard-sub">Role: Government. {isWalletConnected ? ('Connected: ' + short(account)) : 'Presentation preview with sample registry data.'}</p>

        {demoMode && <div className="demo-banner"><strong>Demo presentation mode</strong><span>Sample registry values are shown for review. Connect MetaMask to switch to live contract data.</span></div>}

        {!isWalletConnected && (
          <div className="panel-form">
            <h3>🔌 Connect MetaMask to interact with the blockchain</h3>
            <p className="dashboard-sub">Approvals, penalties, and monitoring require a connected wallet.</p>
            <button className="connect-btn" onClick={connectWallet} disabled={connecting}>
              {connecting ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          </div>
        )}

        {stats && (
          <div className="card-grid">
            <TiltCard className="stat-card"><p className="stat-label">Total Generation Logged</p><p className="stat-value solar">{stats.totalKwh.toLocaleString('en-IN')} kWh</p></TiltCard>
            <TiltCard className="stat-card"><p className="stat-label">Approved Prosumers</p><p className="stat-value trust">{stats.registeredCount}</p></TiltCard>
            <TiltCard className="stat-card"><p className="stat-label">Active Listings</p><p className="stat-value">{stats.activeListings}</p></TiltCard>
            <TiltCard className="stat-card"><p className="stat-label">Pending Approvals</p><p className="stat-value" style={{ color: pendingList.length > 0 ? 'var(--accent-alert)' : undefined }}>{pendingList.length}</p></TiltCard>
          </div>
        )}

        <IndiaConnectionMap
          connections={mapConnections}
          selectedId={selectedMapId}
          zoomed={mapZoomed}
          onSelect={(row) => {
            setSelectedMapId(row.address);
            setMapZoomed(true);
            if (prosumers.some((item) => item.address === row.address)) {
              document.getElementById(`prosumer-${row.address}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
        />

        <h3 className="section-label" style={{ marginTop: 30 }}>📝 Registration approvals</h3>
        {!contract ? <p className="dashboard-sub">Connect a wallet to view approvals.</p> : pendingList.length === 0 ? <p className="dashboard-sub">No pending registrations.</p> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Wallet</th><th>Subsidy ID</th><th>Location</th><th>Capacity</th><th></th></tr></thead><tbody>
            {pendingList.map((r) => (<tr key={r.address}><td className="mono">{short(r.address)}</td><td className="mono">{r.subsidyID}</td><td>{r.location}</td><td>{r.capacityKw} kW</td><td><button className="buy-btn" style={{ width: 'auto', margin: 0 }} onClick={() => handleApprove(r.address)} disabled={pending}>{demoMode ? 'Approve sample' : pending ? 'Confirming...' : 'Approve'}</button></td></tr>))}
          </tbody></table></div>
        )}

        <h3 className="section-label" style={{ marginTop: 30 }}>📍 Registered prosumers — live monitoring</h3>
        {prosumers.length === 0 ? <p className="dashboard-sub">No approved prosumers yet.</p> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Wallet</th><th>Subsidy ID</th><th>Location</th><th>Capacity</th><th>Trust</th><th>Generated</th><th>Last Reading</th><th>Status</th><th></th></tr></thead><tbody>
            {prosumers.map((p) => (
              <tr id={`prosumer-${p.address}`} key={p.address}><td className="mono">{short(p.address)}</td><td className="mono">{p.subsidyID}</td><td>{p.location}</td><td>{p.capacityKw} kW</td><td><strong>{p.trustScore}/100</strong></td><td>{p.generated} kWh</td><td>{p.lastReading} {p.daysSilent > INACTIVITY_WINDOW_DAYS ? '(' + p.daysSilent + 'd silent)' : ''}</td><td><span className={'status-pill ' + (p.atRisk ? 'alert' : 'active')}>{p.atRisk ? 'Fraud Risk' : 'Healthy'}</span></td><td>{p.atRisk && <button className="nav-btn" style={{ color: 'var(--accent-alert)' }} onClick={() => handleCheckInactivity(p.address)} disabled={pending}>{demoMode ? 'Apply sample penalty' : 'Apply Penalty'}</button>}</td></tr>
            ))}
          </tbody></table></div>
        )}
      </div>
      {toast && <div className="tx-toast">{toast.text}</div>}
    </div>
  );
}

function IndiaConnectionMap({ connections, selectedId, zoomed, onSelect }) {
  const [hoveredStateId, setHoveredStateId] = useState(null);
  const [hoveredConnectionId, setHoveredConnectionId] = useState(null);
  const positioned = connections.map((connection, index) => {
    const city = Object.keys(CITY_POSITIONS).find((name) => connection.location?.includes(name));
    const stateCode = connection.location?.split(',').pop()?.trim() || 'MP';
    return { ...connection, stateCode, point: CITY_POSITIONS[city] || { x: 285 + ((index * 43) % 90), y: 330 + ((index * 47) % 130) } };
  });
  const selected = positioned.find((row) => row.address === selectedId) || positioned[0];
  const hovered = positioned.find((row) => row.address === hoveredConnectionId);
  const toneFor = (row) => row.status === 'Fraud Risk' ? 'risk' : row.status === 'Waiting' ? 'waiting' : 'healthy';
  const stateStats = indiaMap.locations.reduce((result, state) => {
    const rows = positioned.filter((row) => STATE_NAMES[row.stateCode] === state.name);
    result[state.id] = { name: state.name, rows, active: rows.filter((row) => toneFor(row) === 'healthy').length, waiting: rows.filter((row) => toneFor(row) === 'waiting').length, risk: rows.filter((row) => toneFor(row) === 'risk').length };
    return result;
  }, {});
  const hoveredState = hoveredStateId ? stateStats[hoveredStateId] : null;
  const detail = hovered || selected;

  return (
    <section className="govt-map-panel" aria-label="India state connection map">
      <div className="govt-map-heading">
        <div><p className="eyebrow">State-level telemetry</p><h3>India connection map</h3><p>Hover a state or city marker for live details. Click a marker to zoom into its connection.</p></div>
        <div className="map-legend" aria-label="Connection status legend"><span><i className="legend-dot healthy"></i>Active</span><span><i className="legend-dot waiting"></i>Waiting</span><span><i className="legend-dot risk"></i>At risk</span><span><i className="legend-dot neutral"></i>No connections</span></div>
      </div>
      <div className={'india-map-stage ' + (zoomed ? 'zoomed' : '')}>
        <svg className="india-map" viewBox={indiaMap.viewBox} role="img" aria-label="Accurate India map divided by states with monitored city connections">
          <g className="india-states">
            {indiaMap.locations.map((state) => {
              const summary = stateStats[state.id];
              const stateTone = summary?.risk ? 'risk' : summary?.waiting ? 'waiting' : summary?.active ? 'healthy' : 'neutral';
              return <path key={state.id} className={'india-state ' + stateTone + (hoveredStateId === state.id ? ' hovered' : '')} d={state.path} tabIndex="0" aria-label={`${state.name}: ${summary?.rows.length || 0} connections`} onMouseEnter={() => setHoveredStateId(state.id)} onMouseLeave={() => setHoveredStateId(null)} onFocus={() => setHoveredStateId(state.id)} onBlur={() => setHoveredStateId(null)}><title>{state.name}</title></path>;
            })}
          </g>
          {positioned.map((row) => <g key={row.address} className={'map-connection ' + (row.address === selectedId ? 'selected' : '')} onMouseEnter={() => setHoveredConnectionId(row.address)} onMouseLeave={() => setHoveredConnectionId(null)}><circle className={'map-pulse ' + toneFor(row)} cx={row.point.x} cy={row.point.y} r={row.address === selectedId ? 21 : 15} /><circle className={'map-marker ' + toneFor(row)} cx={row.point.x} cy={row.point.y} r={row.address === selectedId ? 9 : 7} role="button" tabIndex="0" aria-label={`${row.subsidyID}, ${row.location}, ${row.status}`} onClick={() => onSelect(row)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(row); }} /></g>)}
          {selected && <g className="map-callout" transform={`translate(${Math.min(selected.point.x + 15, 455)} ${Math.max(selected.point.y - 55, 12)})`}><rect width="140" height="46" rx="6" /><text x="10" y="18">{selected.location}</text><text className={toneFor(selected) === 'risk' ? 'callout-risk' : ''} x="10" y="35">{selected.status}</text></g>}
        </svg>
        <div className={'map-detail ' + (hoveredState ? 'state-detail' : '') + (detail && toneFor(detail) === 'risk' ? ' risk' : '')}>
          {hoveredState ? <><span className="map-detail-kicker">State block</span><strong>{hoveredState.name}</strong><span>{hoveredState.rows.length} monitored connection{hoveredState.rows.length === 1 ? '' : 's'}</span><div className="state-counts"><b className="healthy-text">{hoveredState.active} active</b><b className="waiting-text">{hoveredState.waiting} waiting</b><b className="risk-text">{hoveredState.risk} at risk</b></div><em>{hoveredState.rows.length ? 'Hover a city marker for connection telemetry.' : 'No live connection data in this state yet.'}</em></> : detail ? <><span className="map-detail-kicker">{hovered ? 'Connection telemetry' : 'Selected connection'}</span><strong>{detail.subsidyID}</strong><span>{detail.location} · {detail.meterId} · {detail.feeder}</span><span>{detail.lastKwh} kWh observed / {detail.expectedKwh} kWh expected · Trust {detail.trustScore ?? 'Pending'}/100</span><em>{detail.status === 'Fraud Risk' ? detail.riskReason : detail.status === 'Waiting' ? detail.riskReason : 'Generation and feeder telemetry are within the expected operating range.'}</em></> : <em>Select a city marker to inspect its telemetry.</em>}
        </div>
      </div>
    </section>
  );
}
