import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import abiJson from '../SolarSettleABI.json';
import { CONTRACT_ADDRESS, CONTRACT_CHAIN_ID, getChain, isContractConfigured } from '../config';

const CONTRACT_ABI = abiJson.abi;

const Web3Context = createContext(null);
export const useWeb3 = () => useContext(Web3Context);

/** Route for each role. */
export const ROLE_HOME = {
  government: '/govt',
  prosumer: '/prosumer',
  buyer: '/buyer',
};

export function Web3Provider({ children }) {
  // Role selected at login - drives routing & which dashboard to show.
  const [selectedRole, setSelectedRole] = useState(null);

  // Wallet state - connecting MetaMask is optional and happens AFTER login.
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [readProvider, setReadProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const configured = isContractConfigured();

  const switchNetwork = async (provider) => {
    const chain = getChain(CONTRACT_CHAIN_ID);
    if (!chain) throw new Error('No chain metadata for chainId ' + CONTRACT_CHAIN_ID);
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chain.chainIdHex }],
      });
    } catch (switchErr) {
      if (switchErr.code === 4902 || switchErr.data?.originalError?.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chain.chainIdHex,
            chainName: chain.chainName,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: chain.rpcUrls,
            blockExplorerUrls: chain.blockExplorerUrls,
          }],
        });
      } else {
        throw switchErr;
      }
    }
  };

  /** Simple role-select login - no wallet needed. */
  const loginAs = useCallback((role) => {
    setSelectedRole(role);
  }, []);

  /** Optional wallet connect - call this from inside a dashboard. */
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed.');
      return null;
    }
    if (!configured) {
      setError('Contract not deployed yet. Run `npm run deploy:local` first.');
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
      const signer = await provider.getSigner();
      const instance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const finalNet = await provider.getNetwork();

      setAccount(accounts[0]);
      setContract(instance);
      setReadProvider(provider);
      setChainId(Number(finalNet.chainId));
      setConnecting(false);
      return { address: accounts[0] };
    } catch (e) {
      setError(e.code === 4001 ? 'Connection rejected in MetaMask.' : 'Connect failed: ' + (e.shortMessage || e.message));
      setConnecting(false);
      return null;
    }
  }, [configured]);

  const logout = useCallback(() => {
    setSelectedRole(null);
    setAccount(null);
    setContract(null);
    setReadProvider(null);
    setChainId(null);
    setError('');
  }, []);

  useEffect(() => {
    if (!window.ethereum) return undefined;
    const onAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        setAccount(null);
        setContract(null);
      }
    };
    window.ethereum.on?.('accountsChanged', onAccountsChanged);
    return () => window.ethereum.removeListener?.('accountsChanged', onAccountsChanged);
  }, []);

  const isWalletConnected = !!account;
  const chain = getChain(chainId || CONTRACT_CHAIN_ID);

  const value = {
    selectedRole,
    isWalletConnected,
    loginAs,
    logout,
    account,
    contract,
    readProvider,
    chainId,
    chain,
    connecting,
    error,
    configured,
    setError,
    connectWallet,
    contractAbi: CONTRACT_ABI,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}
