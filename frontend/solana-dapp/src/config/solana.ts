import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

export const SOLANA_NETWORK = WalletAdapterNetwork.Devnet;
export const SOLANA_RPC_ENDPOINT = clusterApiUrl(SOLANA_NETWORK);

// You can also use custom RPC endpoints
// export const SOLANA_RPC_ENDPOINT = 'https://api.devnet.solana.com';

export const SOLANA_CONFIG = {
  network: SOLANA_NETWORK,
  endpoint: SOLANA_RPC_ENDPOINT,
  commitment: 'confirmed' as const,
}; 