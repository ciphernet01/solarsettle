import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../context/Web3Context';
import Navbar from '../../components/Navbar';
import useTx from '../../hooks/useTx';
import { fetchPurchaseHistory } from '../../lib/contractReads';
import { buySimListing, getSimListings, getSimPurchases, onSimulationChange } from '../../lib/sharedSimulation';

export default function BuyerDashboard() {
  const { isWalletConnected, account, contract, readProvider, connectWallet, connecting, chain } = useWeb3();
  const { pending, toast, run } = useTx();
  const [chainListings, setChainListings] = useState([]);
  const [chainHistory, setChainHistory] = useState([]);
  const [simListings, setSimListings] = useState(() => getSimListings());
  const [simHistory, setSimHistory] = useState(() => getSimPurchases());
  const [loading, setLoading] = useState(true);
  const [marketFilter, setMarketFilter] = useState('all');

  const short = (a) => a ? (a.slice(0, 6) + '...' + a.slice(-4)) : '';

  const load = useCallback(async () => {
    setLoading(true);
    if (!contract) {
      setChainListings([]);
      setChainHistory([]);
      setLoading(false);
      return;
    }

    try {
      const [ids, sellers, kwhs, prices] = await contract.getActiveListings(0, 50);
      setChainListings(ids.map((id, i) => ({
        id: Number(id),
        displayId: `#${Number(id)}`,
        seller: sellers[i],
        subsidyID: 'On-chain prosumer',
        meterId: 'CHAIN-' + sellers[i].slice(2, 8).toUpperCase(),
        location: 'Contract registry',
        kWh: Number(kwhs[i]),
        pricePerUnit: prices[i],
        priceDisplay: ethers.formatEther(prices[i]),
        source: 'On-chain',
        active: true,
        mine: account && sellers[i].toLowerCase() === account.toLowerCase(),
      })));
      if (readProvider && account) {
        setChainHistory(await fetchPurchaseHistory(readProvider, account));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [contract, readProvider, account]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => onSimulationChange(() => {
    setSimListings(getSimListings());
    setSimHistory(getSimPurchases());
  }), []);

  const activeSimListings = simListings.filter((item) => item.active);
  const listings = useMemo(() => [...activeSimListings, ...chainListings], [activeSimListings, chainListings]);
  const filteredListings = listings.filter((item) => {
    if (marketFilter === 'sim') return item.source === 'Simulated';
    if (marketFilter === 'chain') return item.source === 'On-chain';
    return true;
  });
  const totalKwh = listings.reduce((sum, item) => sum + item.kWh, 0);
  const avgPrice = listings.length
    ? listings.reduce((sum, item) => sum + Number(item.priceDisplay), 0) / listings.length
    : 0;

  const handleBuy = async (listing) => {
    if (listing.source === 'Simulated') {
      buySimListing(listing, account || '0xDemoBuyer');
      setSimListings(getSimListings());
      setSimHistory(getSimPurchases());
      return;
    }

    const total = BigInt(listing.kWh) * listing.pricePerUnit;
    const ok = await run(() => contract.buyEnergy(listing.id, { value: total }), 'Purchased ' + listing.kWh + ' kWh - payment settled on-chain.');
    if (ok) await load();
  };

  const handleCancel = async (listing) => {
    const ok = await run(() => contract.cancelListing(listing.id), 'Listing #' + listing.id + ' cancelled.');
    if (ok) await load();
  };

  return (
    <div className="App">
      <Navbar links={[{ label: 'Prosumer', to: '/prosumer' }, { label: 'Govt', to: '/govt' }]} />
      <main className="role-console">
        <section className="role-hero">
          <div>
            <p className="eyebrow">Energy marketplace</p>
            <h2>Buy verified surplus energy</h2>
            <p className="dashboard-sub">Marketplace inventory is correlated with the prosumer meter and government risk queue. Contract listings settle through MetaMask.</p>
          </div>
          <div className="wallet-status">
            <span className={'connection-dot ' + (isWalletConnected ? 'online' : 'offline')}></span>
            <div>
              <strong>{isWalletConnected ? short(account) : 'Marketplace preview'}</strong>
              <span>{isWalletConnected ? `MetaMask on ${chain?.chainName || 'configured network'}` : 'Connect wallet for blockchain purchases'}</span>
            </div>
            {!isWalletConnected && <button className="connect-btn" onClick={connectWallet} disabled={connecting}>{connecting ? 'Connecting...' : 'Connect MetaMask'}</button>}
          </div>
        </section>

        <section className="ops-strip">
          <Metric label="Available Energy" value={`${totalKwh} kWh`} />
          <Metric label="Active Listings" value={listings.length} />
          <Metric label="Avg Price" value={avgPrice.toFixed(4)} />
          <Metric label="On-chain Listings" value={chainListings.length} tone={chainListings.length ? 'good' : 'neutral'} />
          <Metric label="Settled Orders" value={simHistory.length + chainHistory.length} tone="good" />
        </section>

        <div className="toolbar-row">
          <div>
            <h3>Market Order Book</h3>
            <p>{loading ? 'Reading contract listings...' : `${activeSimListings.length} simulated and ${chainListings.length} on-chain listings available`}</p>
          </div>
          <div className="segmented">
            <button className={marketFilter === 'all' ? 'active' : ''} onClick={() => setMarketFilter('all')}>All</button>
            <button className={marketFilter === 'sim' ? 'active' : ''} onClick={() => setMarketFilter('sim')}>Sim</button>
            <button className={marketFilter === 'chain' ? 'active' : ''} onClick={() => setMarketFilter('chain')}>On-chain</button>
          </div>
        </div>

        <section className="market-grid">
          {filteredListings.map((listing) => (
            <article className="market-card" key={`${listing.source}-${listing.id}`}>
              <div className="market-card-head">
                <span className={'source-badge ' + listing.source.toLowerCase()}>{listing.source}</span>
                <strong>{listing.displayId || listing.id}</strong>
              </div>
              <h3>{listing.kWh} kWh</h3>
              <p>{listing.subsidyID} - {listing.location}</p>
              <dl>
                <div><dt>Seller</dt><dd>{short(listing.seller)}</dd></div>
                <div><dt>Meter</dt><dd>{listing.meterId}</dd></div>
                <div><dt>Price / kWh</dt><dd>{listing.priceDisplay}</dd></div>
                <div><dt>Total</dt><dd>{(listing.kWh * Number(listing.priceDisplay)).toFixed(4)}</dd></div>
              </dl>
              {listing.mine ? (
                <button className="nav-btn cancel-market-btn" onClick={() => handleCancel(listing)} disabled={pending}>Cancel Listing</button>
              ) : (
                <button className="buy-btn" onClick={() => handleBuy(listing)} disabled={pending || (listing.source === 'On-chain' && !isWalletConnected)}>
                  {listing.source === 'On-chain' ? (pending ? 'Confirming...' : 'Buy via MetaMask') : 'Settle Simulated'}
                </button>
              )}
            </article>
          ))}
        </section>

        <section className="history-panel">
          <div className="toolbar-row compact">
            <div>
              <h3>Settlement History</h3>
              <p>Simulated purchases appear immediately; blockchain purchases are read from contract events.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Seller</th><th>Energy</th><th>Total</th><th>Source</th></tr></thead>
              <tbody>
                {[...simHistory, ...chainHistory].length === 0 ? (
                  <tr><td colSpan="5">No settlements yet.</td></tr>
                ) : [...simHistory, ...chainHistory].map((item) => (
                  <tr key={(item.id || item.txHash) + item.listingId}>
                    <td>{item.listingId}</td>
                    <td>{short(item.seller)}</td>
                    <td><strong>{item.kWh} kWh</strong></td>
                    <td>{item.totalDisplay || 'On-chain'}</td>
                    <td><span className={'source-badge ' + (item.source || 'on-chain').toLowerCase()}>{item.source || 'On-chain'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      {toast && <div className="tx-toast">{toast.text}</div>}
    </div>
  );
}

function Metric({ label, value, tone = 'neutral' }) {
  return (
    <div className={'ops-metric ' + tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
