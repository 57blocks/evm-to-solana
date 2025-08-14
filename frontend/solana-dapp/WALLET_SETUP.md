# Solana Wallet Connection Setup

This document explains how the Solana wallet connection is implemented in this dApp using the official wallet-adapter libraries.

## Overview

The wallet connection is implemented using the following libraries:
- `@solana/wallet-adapter-react` - Core wallet adapter functionality
- `@solana/wallet-adapter-react-ui` - Pre-built UI components
- `@solana/wallet-adapter-wallets` - Wallet adapters for various Solana wallets
- `@solana/web3.js` - Solana web3 utilities

## Architecture

### 1. Wallet Provider (`src/providers/WalletProvider.tsx`)
The main provider that wraps the entire application and provides:
- Connection to Solana network (currently set to Devnet)
- Support for multiple wallet types
- Wallet modal for connection/disconnection

### 2. Supported Wallets
The following wallets are currently supported:
- Phantom
- Solflare
- Torus
- Ledger
- Slope
- Sollet (Extension & Web)
- Backpack

### 3. Configuration (`src/config/solana.ts`)
Network configuration settings:
- Network: Devnet (can be changed to Testnet or Mainnet)
- RPC Endpoint: Automatically configured based on network
- Commitment level: Confirmed

## Usage

### Connecting a Wallet
1. Click the "Select Wallet" button in the header
2. Choose your preferred wallet from the modal
3. Approve the connection in your wallet
4. The wallet status will be displayed below the header

### Wallet Status Display
Once connected, you'll see:
- Wallet name
- Truncated public key
- Current SOL balance
- Connection status

### Disconnecting
- Click the wallet button in the header
- Select "Disconnect" from the dropdown

## Customization

### Changing Networks
To change the Solana network, modify `src/config/solana.ts`:

```typescript
export const SOLANA_NETWORK = WalletAdapterNetwork.Mainnet; // or Testnet
```

### Adding Custom RPC Endpoint
```typescript
export const SOLANA_RPC_ENDPOINT = 'https://your-custom-rpc.com';
```

### Adding New Wallet Types
In `WalletProvider.tsx`, add new wallet adapters to the wallets array:

```typescript
import { NewWalletAdapter } from '@solana/wallet-adapter-wallets';

const wallets = useMemo(
  () => [
    // ... existing wallets
    new NewWalletAdapter(),
  ],
  [network]
);
```

## Development

### Testing
- Use Solana Devnet for development
- Get test SOL from: https://faucet.solana.com/
- Test with Phantom or Solflare browser extensions

### Debugging
- Check browser console for connection errors
- Verify wallet extension is installed and unlocked
- Ensure network matches between wallet and dApp

## Security Notes

- Never store private keys in the application
- Always use the wallet adapter for transactions
- Validate all user inputs before processing
- Use proper error handling for failed transactions

## Troubleshooting

### Common Issues

1. **Wallet not connecting**
   - Ensure wallet extension is installed and unlocked
   - Check if wallet supports the selected network
   - Clear browser cache and try again

2. **Balance not showing**
   - Verify network connection
   - Check if wallet has SOL balance
   - Ensure RPC endpoint is accessible

3. **Transaction failures**
   - Verify sufficient SOL for transaction fees
   - Check network congestion
   - Ensure wallet is connected and unlocked

## Resources

- [Wallet Adapter Documentation](https://github.com/anza-xyz/wallet-adapter)
- [Solana Web3.js Documentation](https://docs.solana.com/developing/clients/javascript-api)
- [Solana Networks](https://docs.solana.com/clusters) 