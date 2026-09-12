import React, { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../context/Web3Context';
import Navbar from '../../components/Navbar';
import useTx from '../../hooks/useTx';
import { fetchPurchaseHistory } from '../../lib/contractReads';

/** Marketplace + purchase history for buyers (open to every signed-in role). */
export default function BuyerDashboard() {
  const { account, contract, readProvider, role } = useWeb3();
  const { pending, toast, run } = useTx();
  const [listings, setListings] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const [ids, sellers, kwhs, prices] = await contract.getActiveListings(0, 50);
      setListings(
        ids.map((id, i) => ({
          id: Number(id),
          seller: sellers[i],
          kWh: Number(kwhs[i]),
          pricePerUnit: prices[i],
          priceDisplay: ethers.formatEther(prices[i]),
          mine: sellers[i].toLowerCase() === account.toLowerCase(),
        }))
      );
      if (readProvider) {
        const h = await fetchPurchaseHistory(readProvider, account);
        setHistory(h);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [contract, readProvider, account]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBuy = async (l) => {
    const total = BigInt(l.kWh) * l.pricePerUnit;
    const ok = await run(
      () => contract.buyEnergy(l.id, { value: total }),
      `✅ Purchased ${l.kWh} kWh — payment settled on-chain.`
    );
    if (ok) await load();
  };

  const handleCancel = async (l) => {
    const ok = await run(
      () => contract.cancelListing(l.id),
      `✅ Listing #${l.id} cancelled.`
    );
    if (ok) await load();
  };

  const short = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <div className="App">
      <Navbar links={[{ label: 'Home', to: '/login' }]} />
      <div className="dashboard">
        <h2>⚡ Energy Marketplace</h2>
        <p className="dashboard-sub">
          Signed in as <span className="mono">{short(account)}</span>
          {role === 'prosumer' ? ' · prosumer (you can also sell here)' : ''} — purchases settle
          instantly through the smart contract, with automatic refunds on overpayment.
        </p>

        {loading ? (
          <p className="dashboard-sub">Loading listings from the blockchain…</p>
        ) : listings.length === 0 ? (
          <div className="table-wrap">
            <p className="dashboard-sub" style={{ padding: 22, margin: 0 }}>
              No active listings right now. Registered prosumers list surplus energy from their dashboard.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Seller</th>
                  <th>Energy</th>
                  <th>Price / kWh</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td>#{l.id}</td>
                    <td className="mono">{short(l.seller)}{l.mine ? ' (you)' : ''}</td>
                    <td><strong>{l.kWh} kWh</strong></td>
                    <td>{l.priceDisplay}</td>
                    <td><strong>{(l.kWh * parseFloat(l.priceDisplay)).toFixed(5)}</strong></td>
                    <td>
                      {l.mine ? (
                        <button className="nav-btn" style={{ color: 'var(--accent-alert)' }} onClick={() => handleCancel(l)} disabled={pending}>
                          Cancel
                        </button>
                      ) : (
                        <button className="buy-btn" style={{ width: 'auto', margin: 0 }} onClick={() => handleBuy(l)} disabled={pending}>
                          {pending ? 'Confirming…' : 'Buy'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="section-label" style={{ marginTop: 34 }}>🧾 Your purchases (on-chain history)</h3>
        {history.length === 0 ? (
          <p className="dashboard-sub">No purchases yet. Buy your first listing above.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Listing</th><th>Seller</th><th>Energy</th><th>Block</th><th>Tx</th></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={`${h.txHash}-${h.listingId}`}>
                    <td>#{h.listingId}</td>
                    <td className="mono">{short(h.seller)}</td>
                    <td><strong>{h.kWh} kWh</strong></td>
                    <td>{h.blockNumber}</td>
                    <td><a className="mono" href={`https://amoy.polygonscan.com/tx/${h.txHash}`} target="_blank" rel="noreferrer">{h.txHash.slice(0, 10)}…</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {toast && <div className="tx-toast">{toast.text}</div>}
    </div>
  );
}
