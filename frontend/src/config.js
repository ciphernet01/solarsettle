import deployed from './deployedAddress.json';

export const CONTRACT_ADDRESS = deployed.address;
export const CONTRACT_CHAIN_ID = deployed.chainId;

/** True once `scripts/deploy.ts` has written a real address. */
export const isContractConfigured = () =>
  typeof CONTRACT_ADDRESS === 'string' && CONTRACT_ADDRESS.startsWith('0x') &&
  CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';

/** Chain metadata for networks this product ships with. */
export const CHAINS = {
  31337: {
    chainIdHex: '0x7a69',
    chainName: 'Hardhat Local',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorerUrls: [],
  },
  80002: {
    chainIdHex: '0x13882',
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: ['https://polygon-amoy-bor-rpc.publicnode.com'],
    blockExplorerUrls: ['https://amoy.polygonscan.com'],
  },
  10143: {
    chainIdHex: '0x279f',
    chainName: 'Monad Testnet',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: ['https://testnet-rpc.monad.xyz'],
    blockExplorerUrls: ['https://testnet.monadexplorer.com'],
  },
};

export const getChain = (chainId) => CHAINS[Number(chainId)] || null;