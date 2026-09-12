import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import abiJson from '../SolarSettleABI.json';
import { CONTRACT_ADDRESS, CONTRACT_CHAIN_ID, getChain, isContractConfigured } from '../config';

const CONTRACT_ABI = abiJson.abi;

const Web3Context = createContext(null);
export const useWeb3 = () => useContext(Web3Context);

/** Where each role lands after login. */
export const ROLE_HOME = {
  government: '/govt',
  prosumer: '/prosumer',
  'pending-prosumer': '/prosumer',
  buyer: '/buyer',
};

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [readProvider, setReadProvider] = useState(null);
  const [role, setRole] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const configured = isContractConfigured();

  const switchNetwork = async (provider) => {
    const chain = getChain(CONTRACT_CHAIN_ID);
    if (!chain) throw new Error(`No chain metadata for chainId ${CONTRACT_CHAIN_ID}`);
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chain.chainIdHex }],
      });
    } catch (switchErr) {
      if (switchErr.code === 4902 || switchErr.data?.originalError?.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chain.chainIdHex,
              chainName: chain.chainName,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: chain.rpcUrls,
              blockExplorerUrls: chain.blockExplorerUrls,
            },
          ],
        });
      } else {
        throw switchErr;
      }
    }
  };

  const resolveRole = useCallback(async (instance, address) => {
    try {
      const owner = await instance.owner();
      if (owner.toLowerCase() === address.toLowerCase()) return 'government';
    } catch {
      /* owner() read failed — fall through to prosumer check */
    }
    try {
      const p = await instance.getProsumer(address);
      if (p.registered) return 'prosumer';
      if (p.pendingApproval) return 'pending-prosumer';
    } catch {
      /* not a prosumer */
    }
    return 'buyer';
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Install it from https://metamask.io to sign in.');
      return null;
    }
    if (!configured) {
      setError('Contract is not deployed yet. Run `npm run deploy:local` in the project root first.');
      return null;
    }
    setConnecting(true);
    setError('');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const net = await provider.getNetwork();
      if (Number(net.chainId) !== CONTRACT_CHAIN_ID) {
        await switchNetwork(provider);
      }
      const accounts = await provider.send('eth_requestAccounts', []);
      const address = accounts[0];
      const signer = await provider.getSigner();
      const instance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const resolvedRole = await resolveRole(instance, address);
      const finalNet = await provider.getNetwork();

      setAccount(address);
      setContract(instance);
      setReadProvider(provider);
      setRole(resolvedRole);
      setChainId(Number(finalNet.chainId));
      setConnecting(false);
      return { role: resolvedRole, address };
    } catch (e) {
      setError(e.code === 4001 ? 'Connection rejected in MetaMask.' : `Sign-in failed: ${e.shortMessage || e.message}`);
      setConnecting(false);
      return null;
    }
  }, [configured, resolveRole]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setContract(null);
    setRole(null);
  }, []);

  /** Re-resolve the role after an on-chain action (e.g. prosumer registration). */
  const refreshRole = useCallback(async () => {
    if (!contract || !account) return null;
    const resolved = await resolveRole(contract, account);
    setRole(resolved);
    return resolved;
  }, [contract, account, resolveRole]);

  // React to wallet-side changes (account switch, network switch, disconnect).
  useEffect(() => {
    if (!window.ethereum) return undefined;
    const onAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        disconnect();
      } else if (account && accounts[0].toLowerCase() !== account.toLowerCase()) {
        // Different account — force a fresh sign-in so the role is re-resolved.
        disconnect();
        setError('Wallet account changed. Please sign in again.');
      }
    };
    const onChainChanged = () => window.location.reload();
    window.ethereum.on?.('accountsChanged', onAccountsChanged);
    window.ethereum.on?.('chainChanged', onChainChanged);
    return () => {
      window.ethereum.removeListener?.('accountsChanged', onAccountsChanged);
      window.ethereum.removeListener?.('chainChanged', onChainChanged);
    };
  }, [account, disconnect]);

  const chain = getChain(chainId || CONTRACT_CHAIN_ID);

  const value = {
    account,
    contract,
    readProvider,
    role,
    chainId,
    chain,
    connecting,
    error,
    configured,
    setError,
    connect,
    disconnect,
    refreshRole,
    contractAbi: CONTRACT_ABI,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}
