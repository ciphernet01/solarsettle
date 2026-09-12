import React, { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../context/Web3Context';
import Navbar from '../../components/Navbar';
import useTx from '../../hooks/useTx';
import { fetchPurchaseHistory } from '../../lib/contractReads';
import './BuyerDashboard.css';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'network', label: 'Prosumer Network' },
  { key: 'energy', label: 'My Energy' },
  { key: 'transactions', label: 'Transactions' },
];

const emptyRequest = { name: '', requirement: '', propertyType: 'Home', rooftop: 'Unknown' };
const DEMO_PROVIDERS = [
  { address: '0x7A1D00000000000000000000000000000000B101', subsidyID: 'GreenRay Solar', location: 'Greater Noida, UP', capacityKw: 5.2, trustScore: 94, generated: 2140, credits: 2140, availableKwh: 240, listingCount: 1, pricePerUnit: 4200000000000000n, priceDisplay: '0.0042' },
  { address: '0x7A1D00000000000000000000000000000000B102', subsidyID: 'SunGrid Cooperative', location: 'Bhopal, MP', capacityKw: 8.4, trustScore: 91, generated: 3860, credits: 3860, availableKwh: 180, listingCount: 1, pricePerUnit: 4050000000000000n, priceDisplay: '0.00405' },
  { address: '0x7A1D00000000000000000000000000000000B103', subsidyID: 'EcoPower Farm', location: 'Indore, MP', capacityKw: 6.8, trustScore: 97, generated: 4720, credits: 4720, availableKwh: 320, listingCount: 1, pricePerUnit: 4300000000000000n, priceDisplay: '0.0043' },
  { address: '0x7A1D00000000000000000000000000000000B104', subsidyID: 'DesertSun Collective', location: 'Jodhpur, Rajasthan', capacityKw: 12.5, trustScore: 89, generated: 6890, credits: 6890, availableKwh: 0, listingCount: 0, pricePerUnit: 0n, priceDisplay: null },
  { address: '0x7A1D00000000000000000000000000000000B105', subsidyID: 'Konkan Solar Works', location: 'Pune, Maharashtra', capacityKw: 4.6, trustScore: 93, generated: 3180, credits: 3180, availableKwh: 0, listingCount: 0, pricePerUnit: 0n, priceDisplay: null },
  { address: '0x7A1D00000000000000000000000000000000B106', subsidyID: 'Kaveri Green Energy', location: 'Mysuru, Karnataka', capacityKw: 7.1, trustScore: 86, generated: 2910, credits: 2910, availableKwh: 0, listingCount: 0, pricePerUnit: 0n, priceDisplay: null },
  { address: '0x7A1D00000000000000000000000000000000B107', subsidyID: 'Coastal Rays Network', location: 'Coimbatore, Tamil Nadu', capacityKw: 9.3, trustScore: 95, generated: 5540, credits: 5540, availableKwh: 0, listingCount: 0, pricePerUnit: 0n, priceDisplay: null },
  { address: '0x7A1D00000000000000000000000000000000B108', subsidyID: 'Capital Solar Circle', location: 'New Delhi, Delhi', capacityKw: 6.2, trustScore: 92, generated: 4010, credits: 4010, availableKwh: 0, listingCount: 0, pricePerUnit: 0n, priceDisplay: null },
  { address: '0x7A1D00000000000000000000000000000000B109', subsidyID: 'Mumbai Sun Collective', location: 'Mumbai, Maharashtra', capacityKw: 3.8, trustScore: 90, generated: 2670, credits: 2670, availableKwh: 0, listingCount: 0, pricePerUnit: 0n, priceDisplay: null },
  { address: '0x7A1D00000000000000000000000000000000B10A', subsidyID: 'Bengaluru BrightGrid', location: 'Bengaluru, Karnataka', capacityKw: 5.5, trustScore: 96, generated: 4380, credits: 4380, availableKwh: 0, listingCount: 0, pricePerUnit: 0n, priceDisplay: null },
  { address: '0x7A1D00000000000000000000000000000000B10B', subsidyID: 'Charminar Solar Hub', location: 'Hyderabad, Telangana', capacityKw: 7.8, trustScore: 88, generated: 3290, credits: 3290, availableKwh: 0, listingCount: 0, pricePerUnit: 0n, priceDisplay: null },
  { address: '0x7A1D00000000000000000000000000000000B10C', subsidyID: 'Sabarmati Solar Link', location: 'Ahmedabad, Gujarat', capacityKw: 11.2, trustScore: 94, generated: 7310, credits: 7310, availableKwh: 0, listingCount: 0, pricePerUnit: 0n, priceDisplay: null },
  { address: '0x7A1D00000000000000000000000000000000B10D', subsidyID: 'Pink City Renewables', location: 'Jaipur, Rajasthan', capacityKw: 9.7, trustScore: 91, generated: 6120, credits: 6120, availableKwh: 0, listingCount: 0, pricePerUnit: 0n, priceDisplay: null },
  { address: '0x7A1D00000000000000000000000000000000B10E', subsidyID: 'Gomti Solar Initiative', location: 'Lucknow, Uttar Pradesh', capacityKw: 4.2, trustScore: 42, generated: 980, credits: 980, availableKwh: 0, listingCount: 0, pricePerUnit: 0n, priceDisplay: null },
  { address: '0x7A1D00000000000000000000000000000000B10F', subsidyID: 'Hooghly Sun Works', location: 'Kolkata, West Bengal', capacityKw: 6.3, trustScore: 31, generated: 740, credits: 740, availableKwh: 0, listingCount: 0, pricePerUnit: 0n, priceDisplay: null },
  { address: '0x7A1D00000000000000000000000000000000B110', subsidyID: 'Ganga Green Power', location: 'Patna, Bihar', capacityKw: 3.6, trustScore: 56, generated: 1260, credits: 1260, availableKwh: 0, listingCount: 0, pricePerUnit: 0n, priceDisplay: null },
];
const DEMO_LISTINGS = DEMO_PROVIDERS.slice(0, 3).map((provider, index) => ({ id: index + 101, seller: provider.address, kWh: provider.availableKwh, pricePerUnit: provider.pricePerUnit, priceDisplay: provider.priceDisplay, mine: false, provider }));
const DEMO_HISTORY = [
  { listingId: 88, seller: DEMO_PROVIDERS[0].address, kWh: 100, total: 420000000000000000n, txHash: '0x' + 'a'.repeat(64), blockNumber: 184210 },
  { listingId: 74, seller: DEMO_PROVIDERS[0].address, kWh: 80, total: 324000000000000000n, txHash: '0x' + 'b'.repeat(64), blockNumber: 183904 },
];

export default function BuyerDashboard() {
  const { isWalletConnected, account, contract, readProvider, connectWallet, connecting } = useWeb3();
  const { pending, toast, run, setToast } = useTx();
  const [activeTab, setActiveTab] = useState('overview');
  const [listings, setListings] = useState([]);
  const [providers, setProviders] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [sortBy, setSortBy] = useState('trust');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [request, setRequest] = useState(emptyRequest);
  const [requestSent, setRequestSent] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const load = useCallback(async () => {
    if (!contract || !account) {
      setListings(DEMO_LISTINGS);
      setProviders(DEMO_PROVIDERS);
      setHistory(DEMO_HISTORY);
      setDemoMode(true);
      setLoading(false);
      return;
    }
    setDemoMode(false);
    setLoading(true);
    try {
      const [ids, sellers, kwhs, prices] = await contract.getActiveListings(0, 50);
      const activeListings = ids.map((id, i) => ({
        id: Number(id),
        seller: sellers[i],
        kWh: Number(kwhs[i]),
        pricePerUnit: prices[i],
        priceDisplay: ethers.formatEther(prices[i]),
        mine: sellers[i].toLowerCase() === account.toLowerCase(),
      }));
      const addresses = await contract.registeredProsumers();
      const profiles = await Promise.all(addresses.map((address) => contract.getProsumer(address)));
      const providerRows = addresses.map((address, i) => {
        const profile = profiles[i];
        const sellerListings = activeListings.filter((listing) => listing.seller.toLowerCase() === address.toLowerCase());
        const cheapest = sellerListings.sort((a, b) => (a.pricePerUnit < b.pricePerUnit ? -1 : 1))[0];
        return {
          address,
          subsidyID: profile.subsidyID,
          location: profile.location || 'Area not provided',
          capacityKw: Number(profile.panelCapacity) / 1000,
          trustScore: Number(profile.trustScore),
          generated: Number(profile.totalEnergyGenerated),
          credits: Number(profile.carbonCredits),
          availableKwh: sellerListings.reduce((total, listing) => total + listing.kWh, 0),
          listingCount: sellerListings.length,
          pricePerUnit: cheapest?.pricePerUnit || 0n,
          priceDisplay: cheapest ? cheapest.priceDisplay : null,
        };
      });
      setListings(activeListings.map((listing) => ({
        ...listing,
        provider: providerRows.find((provider) => provider.address.toLowerCase() === listing.seller.toLowerCase()),
      })));
      setProviders(providerRows);
      if (readProvider) {
        const rawHistory = await fetchPurchaseHistory(readProvider, account);
        const historyWithPrices = await Promise.all(rawHistory.map(async (purchase) => {
          const listing = await contract.listings(purchase.listingId);
          const pricePerUnit = listing.pricePerUnit;
          return { ...purchase, pricePerUnit, total: BigInt(purchase.kWh) * pricePerUnit };
        }));
        setHistory(historyWithPrices);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [contract, readProvider, account]);

  useEffect(() => { load(); }, [load]);

  const handleBuy = async (listing) => {
    if (demoMode) {
      const total = BigInt(listing.kWh) * listing.pricePerUnit;
      setListings((current) => current.filter((item) => item.id !== listing.id));
      setProviders((current) => current.map((provider) => provider.address.toLowerCase() === listing.seller.toLowerCase()
        ? { ...provider, availableKwh: Math.max(0, provider.availableKwh - listing.kWh), listingCount: Math.max(0, provider.listingCount - 1) }
        : provider));
      setHistory((current) => [{ listingId: listing.id, seller: listing.seller, kWh: listing.kWh, total, pricePerUnit: listing.pricePerUnit, txHash: '0x' + String(listing.id).padStart(64, '0'), blockNumber: 190000 + listing.id }, ...current]);
      setToast({ kind: 'ok', text: 'Demo purchase completed - sample settlement added to your history.' });
      return;
    }
    const total = BigInt(listing.kWh) * listing.pricePerUnit;
    const ok = await run(() => contract.buyEnergy(listing.id, { value: total }), 'Purchased ' + listing.kWh + ' kWh - settlement confirmed on-chain.');
    if (ok) await load();
  };

  const handleCancel = async (listing) => {
    if (demoMode) {
      setListings((current) => current.filter((item) => item.id !== listing.id));
      setProviders((current) => current.map((provider) => provider.address.toLowerCase() === listing.seller.toLowerCase()
        ? { ...provider, availableKwh: Math.max(0, provider.availableKwh - listing.kWh), listingCount: Math.max(0, provider.listingCount - 1) }
        : provider));
      setToast({ kind: 'ok', text: 'Demo listing cancelled - the sample listing was removed.' });
      return;
    }
    const ok = await run(() => contract.cancelListing(listing.id), 'Listing #' + listing.id + ' cancelled.');
    if (ok) await load();
  };

  const handleRequest = (event) => {
    event.preventDefault();
    setRequestSent(true);
  };

  const short = (address) => address ? address.slice(0, 6) + '...' + address.slice(-4) : '';
  const filteredProviders = providers
    .filter((provider) => {
      const text = (provider.location + ' ' + provider.subsidyID + ' ' + provider.address).toLowerCase();
      return text.includes(query.toLowerCase()) && (!location || provider.location.toLowerCase().includes(location.toLowerCase()));
    })
    .sort((a, b) => sortBy === 'price' ? Number(a.pricePerUnit - b.pricePerUnit) : sortBy === 'available' ? b.availableKwh - a.availableKwh : b.trustScore - a.trustScore);
  const marketEnergy = listings.reduce((total, listing) => total + listing.kWh, 0);
  const purchasedEnergy = history.reduce((total, purchase) => total + purchase.kWh, 0);
  const purchasedValue = history.reduce((total, purchase) => total + purchase.total, 0n);
  const averagePrice = demoMode
    ? '0.25'
    : purchasedEnergy
      ? Number(ethers.formatEther(purchasedValue / BigInt(purchasedEnergy))).toFixed(2)
      : '0.00';
  const linkedSellerAddress = history[0]?.seller.toLowerCase();
  const linkedListings = listings.filter((listing) => listing.seller.toLowerCase() === linkedSellerAddress);

  const renderConnect = () => (
    <section className="buyer-connect-state">
      <div className="buyer-connect-mark">◎</div>
      <div>
        <p className="buyer-eyebrow">Wallet access required</p>
        <h3>Connect to explore verified solar energy</h3>
        <p>Live listings, provider profiles, purchases, and settlement history are read from the connected network.</p>
      </div>
      <button className="buyer-primary-btn" onClick={connectWallet} disabled={connecting}>{connecting ? 'Connecting...' : 'Connect wallet'}</button>
    </section>
  );

  const renderProviderCard = (provider, compact = false) => (
    <article className={'buyer-provider-card' + (compact ? ' compact' : '')} key={provider.address}>
      <div className="buyer-provider-topline">
        <span className="buyer-provider-avatar">{(provider.location || 'S').slice(0, 1).toUpperCase()}</span>
        <div>
          <h3>{provider.subsidyID || 'Verified solar provider'}</h3>
          <p className="buyer-muted">{provider.location}</p>
        </div>
        <span className="buyer-verified">Verified</span>
      </div>
      <div className="buyer-provider-stats">
        <span><strong>{provider.availableKwh.toLocaleString('en-IN')}</strong><small>Available kWh</small></span>
        <span><strong>{provider.trustScore}/100</strong><small>Trust score</small></span>
        <span><strong>{provider.capacityKw.toFixed(1)} kW</strong><small>Solar capacity</small></span>
      </div>
      <div className="buyer-provider-meta">
        <span>{provider.priceDisplay ? provider.priceDisplay + ' ETH / kWh' : 'No active price'}</span>
        <span>{provider.generated.toLocaleString('en-IN')} kWh generated</span>
        <span>{demoMode ? '☎ Regional desk: +91 1800 202 2040' : 'Contact after verified request'}</span>
      </div>
      <div className="buyer-card-actions">
        <button className="buyer-secondary-btn" onClick={() => { setSelectedProvider(provider); setRequestSent(false); }}>View provider</button>
        {provider.listingCount > 0 && <button className="buyer-primary-btn small" onClick={() => { setSelectedProvider(provider); setRequestSent(false); }}>Explore energy</button>}
      </div>
    </article>
  );

  const renderOverview = () => (
    <>
      <section className="buyer-welcome">
        <div>
          <p className="buyer-eyebrow">Buyer workspace</p>
          <h2>Find solar energy that fits your area.</h2>
          <p>Discover verified prosumers, compare available surplus, and settle purchases through SolarSettle.</p>
        </div>
        <div className="buyer-location-box">
          <label htmlFor="buyer-location">Where do you need energy?</label>
          <div className="buyer-input-wrap"><span>⌖</span><input id="buyer-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Enter city or locality" /></div>
          <small>Location helps you compare nearby providers. Grid eligibility still requires utility approval.</small>
        </div>
      </section>
      <section className="buyer-action-grid">
        <button className="buyer-action-card solar" onClick={() => setActiveTab('marketplace')}><span>☀</span><div><strong>Buy solar energy</strong><small>Compare live surplus listings and settle a purchase.</small></div><b>→</b></button>
        <button className="buyer-action-card network" onClick={() => setActiveTab('network')}><span>⌁</span><div><strong>Find a prosumer</strong><small>Explore verified providers and connection information.</small></div><b>→</b></button>
      </section>
      <section className="buyer-stat-grid">
        <div><small>Energy available</small><strong>{marketEnergy.toLocaleString('en-IN')} kWh</strong><span>{listings.length} active listing{listings.length === 1 ? '' : 's'}</span></div>
        <div><small>Verified providers</small><strong>{providers.length}</strong><span>{location ? 'Matching your search area' : 'Across the network'}</span></div>
        <div><small>Your energy</small><strong>{purchasedEnergy.toLocaleString('en-IN')} kWh</strong><span>{history.length} settled purchase{history.length === 1 ? '' : 's'}</span></div>
        <div><small>Average paid</small><strong>{averagePrice} ETH</strong><span>Per purchased kWh</span></div>
      </section>
      <div className="buyer-section-heading"><div><p className="buyer-eyebrow">Recommended providers</p><h2>Strongest available matches</h2></div><button className="buyer-text-btn" onClick={() => setActiveTab('network')}>View network →</button></div>
      {filteredProviders.length ? <div className="buyer-provider-grid">{filteredProviders.slice(0, 3).map((provider) => renderProviderCard(provider, true))}</div> : <EmptyState text="No verified prosumers match this area yet." />}
    </>
  );

  const renderMarketplace = () => (
    <>
      <div className="buyer-section-heading"><div><p className="buyer-eyebrow">Your solar connection</p><h2>Buy from linked prosumers</h2><p>Only prosumers connected to your completed purchase history appear here. Discover new providers separately in the Prosumer Network.</p></div></div>
      <div className="buyer-toolbar"><div className="buyer-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search locality, provider, or wallet" /></div><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort providers"><option value="trust">Sort: highest trust</option><option value="price">Sort: lowest price</option><option value="available">Sort: most energy</option></select></div>
      {loading ? <LoadingState /> : linkedListings.length === 0 ? <EmptyState text="No active energy is available from your linked prosumers." /> : <div className="buyer-listing-grid">{linkedListings.filter((listing) => !query || (listing.provider?.location + listing.seller).toLowerCase().includes(query.toLowerCase())).map((listing) => (
        <article className="buyer-listing-card" key={listing.id}>
          <div className="buyer-listing-header"><span className="buyer-live-dot" />Live listing <span className="buyer-listing-id">#{listing.id}</span></div>
          <h3>{listing.provider?.subsidyID || 'Verified prosumer'}</h3><p className="buyer-muted">{listing.provider?.location || short(listing.seller)} · <span className="mono">{short(listing.seller)}</span></p>
          <div className="buyer-listing-price"><span><strong>{listing.kWh.toLocaleString('en-IN')}</strong><small>kWh available</small></span><span><strong>{listing.priceDisplay}</strong><small>ETH / kWh</small></span></div>
          <div className="buyer-listing-total">Estimated settlement <strong>{ethers.formatEther(BigInt(listing.kWh) * listing.pricePerUnit)} ETH</strong></div>
          <div className="buyer-card-actions">{listing.mine ? <button className="buyer-secondary-btn danger" onClick={() => handleCancel(listing)} disabled={pending}>{demoMode ? 'Cancel sample listing' : 'Cancel listing'}</button> : <button className="buyer-primary-btn" onClick={() => handleBuy(listing)} disabled={pending}>{demoMode ? 'Buy sample energy' : pending ? 'Confirming...' : 'Buy this energy'}</button>}</div>
        </article>
      ))}</div>}
    </>
  );

  const renderNetwork = () => (
    <>
      <div className="buyer-section-heading"><div><p className="buyer-eyebrow">Discovery directory</p><h2>Prosumer network</h2><p>Browse participating prosumers by approximate area, capacity, trust, and available surplus. A verified prosumer is not automatically an installer.</p></div></div>
      <div className="buyer-toolbar"><div className="buyer-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search providers or locality" /></div><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort network"><option value="trust">Sort: highest trust</option><option value="price">Sort: lowest price</option><option value="available">Sort: most energy</option></select></div>
      {loading ? <LoadingState /> : filteredProviders.length ? <div className="buyer-provider-grid">{filteredProviders.map((provider) => renderProviderCard(provider))}</div> : <EmptyState text="No participating prosumers match your search." />}
    </>
  );

  const renderEnergy = () => (
    <>
      <div className="buyer-section-heading"><div><p className="buyer-eyebrow">Personal energy</p><h2>Your renewable contribution</h2><p>Measured from completed on-chain purchases. Environmental impact calculations are intentionally left to a defined project methodology.</p></div></div>
      <section className="buyer-impact-grid"><div><small>Purchased energy</small><strong>{purchasedEnergy.toLocaleString('en-IN')} kWh</strong><span>Verified settlement records</span></div><div><small>Total settled</small><strong>{ethers.formatEther(purchasedValue)} ETH</strong><span>Across {history.length} transaction{history.length === 1 ? '' : 's'}</span></div><div><small>Current marketplace</small><strong>{marketEnergy.toLocaleString('en-IN')} kWh</strong><span>{listings.length} providers selling now</span></div></section>
      <div className="buyer-info-band"><span>◌</span><div><strong>Grid and digital layer</strong><p>The connected energy network handles physical delivery. SolarSettle provides discovery, verification, and settlement records.</p></div></div>
    </>
  );

  const renderTransactions = () => (
    <>
      <div className="buyer-section-heading"><div><p className="buyer-eyebrow">Settlement records</p><h2>Transaction history</h2><p>Purchases are read from <span className="mono">EnergyPurchased</span> events on the connected network.</p></div></div>
      {history.length === 0 ? <EmptyState text="No completed purchases yet. Your settled energy will appear here." /> : <div className="buyer-history-list">{history.map((purchase) => <article key={purchase.txHash + purchase.listingId} className="buyer-history-row"><div><span className="buyer-status-dot" />Settled <small>Listing #{purchase.listingId}</small></div><strong>{purchase.kWh} kWh</strong><span>{ethers.formatEther(purchase.total)} ETH</span><span className="mono">{short(purchase.seller)}</span><a href={'https://amoy.polygonscan.com/tx/' + purchase.txHash} target="_blank" rel="noreferrer">View tx ↗</a></article>)}</div>}
    </>
  );

  return (
    <div className="App buyer-app">
      <Navbar links={[{ label: 'Home', to: '/login' }]} />
      <main className="dashboard buyer-dashboard">
        <header className="buyer-page-header"><div><p className="buyer-kicker">SolarSettle / Buyer</p><h1>Energy workspace</h1><p>{isWalletConnected ? 'Your marketplace, provider discovery, and settlement records.' : 'Presentation preview with sample marketplace data.'}</p></div><div className="buyer-network-state"><span className={isWalletConnected ? 'buyer-live-dot' : 'buyer-muted-dot'} />{isWalletConnected ? 'Network connected' : 'Demo data'}</div></header>
        {demoMode && <div className="demo-banner"><strong>Demo presentation mode</strong><span>Sample values are shown for review. Connect MetaMask to switch to live contract data.</span></div>}
        {!isWalletConnected && !demoMode ? renderConnect() : <>
          <nav className="buyer-tabs" aria-label="Buyer dashboard sections">{TABS.map((tab) => <button key={tab.key} className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>{tab.label}{tab.key === 'marketplace' && listings.length > 0 && <span>{listings.length}</span>}</button>)}</nav>
          {loading && activeTab === 'overview' ? <LoadingState /> : activeTab === 'overview' ? renderOverview() : activeTab === 'marketplace' ? renderMarketplace() : activeTab === 'network' ? renderNetwork() : activeTab === 'energy' ? renderEnergy() : renderTransactions()}
        </>}
      </main>
      {selectedProvider && <div className="buyer-modal-backdrop" role="presentation" onClick={() => setSelectedProvider(null)}><section className="buyer-modal" role="dialog" aria-modal="true" aria-labelledby="provider-dialog-title" onClick={(event) => event.stopPropagation()}><button className="buyer-modal-close" onClick={() => setSelectedProvider(null)} aria-label="Close provider details">×</button><p className="buyer-eyebrow">Verified prosumer</p><h2 id="provider-dialog-title">{selectedProvider.subsidyID || 'Solar provider'}</h2><p className="buyer-muted">{selectedProvider.location} · approximate area only</p><div className="buyer-detail-grid"><div><small>Trust score</small><strong>{selectedProvider.trustScore}/100</strong></div><div><small>Solar capacity</small><strong>{selectedProvider.capacityKw.toFixed(1)} kW</strong></div><div><small>Generated</small><strong>{selectedProvider.generated.toLocaleString('en-IN')} kWh</strong></div><div><small>Credits</small><strong>{selectedProvider.credits.toLocaleString('en-IN')}</strong></div></div><div className="buyer-verification-list"><span>✓ Registered prosumer</span><span>✓ On-chain trust score</span><span>✓ Generation history available</span><span>! Connection requires utility eligibility</span></div><h3>Request a connection conversation</h3>{requestSent ? <div className="buyer-request-sent"><strong>Inquiry prepared</strong><p>This demo records the form state locally. A production connection request needs a backend or contract method.</p></div> : <form onSubmit={handleRequest} className="buyer-request-form"><input required placeholder="Your name or organization" value={request.name} onChange={(event) => setRequest({ ...request, name: event.target.value })} /><input required type="number" min="1" placeholder="Estimated monthly kWh" value={request.requirement} onChange={(event) => setRequest({ ...request, requirement: event.target.value })} /><div><select value={request.propertyType} onChange={(event) => setRequest({ ...request, propertyType: event.target.value })}><option>Home</option><option>Apartment</option><option>Commercial</option></select><select value={request.rooftop} onChange={(event) => setRequest({ ...request, rooftop: event.target.value })}><option>Rooftop status: Unknown</option><option>Rooftop available</option><option>No rooftop</option></select></div><button className="buyer-primary-btn" type="submit">Prepare connection inquiry</button></form>}</section></div>}
      {toast && <div className="tx-toast">{toast.text}</div>}
    </div>
  );
}

function LoadingState() {
  return <div className="buyer-loading" aria-live="polite"><span /><span /><span />Loading live energy data…</div>;
}

function EmptyState({ text }) {
  return <div className="buyer-empty"><span>⌁</span><strong>{text}</strong><p>Try another area or check back after a prosumer lists verified surplus energy.</p></div>;
}
