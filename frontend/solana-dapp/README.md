# Solana Staking DApp

A comprehensive staking DApp built for the Solana blockchain that demonstrates how to interact with Solana programs using modern Web3 technologies. This repository serves as a practical guide for developers learning to build decentralized applications on Solana.

> **⚠️ TESTNET ONLY**
>
> This application is deployed and runs exclusively on **Solana Testnet**. Due to the integration of the **Jito Bundle** feature for MEV protection, which requires specific validator infrastructure, we have chosen to launch on testnet for development and testing purposes.
>
> **You will need Testnet tokens to use this application:**
>
> - Get free Testnet SOL from the [Solana Faucet](https://faucet.solana.com/) — **make sure to select "Testnet" in the network dropdown** (the default is Devnet)
> - Mint test staking/reward tokens using the provided script (see below)

## 🚀 Features

### Core Functionality

- **🔗 Multi-Wallet Support**: Connect with Phantom, Solflare, Backpack, Trezor, Ledger and more via Wallet Adapter
- **✍️ Sign Message**: Message signing for wallet authentication and verification
- **💰 Token Staking**: Stake tokens to earn rewards with real-time tracking
- **🎁 Claim Rewards**: Claim accumulated staking rewards with one click
- **📊 Live Updates**: Real-time stake information and pending reward display
- **📜 Reward History**: View transaction history (stake, unstake, claim) with totals and per-event details
- **📡 Event Listener**: Parse and display on-chain events from transaction logs

### Advanced Transaction Features

- **🚀 Jito Bundle**: MEV protection via private transaction submission to Jito validators
- **⚡ Priority Fees**: Dynamic fee calculation based on network congestion for faster confirmation
- **🔄 Transaction Retry**: Automatic retry mechanism within blockhash validity period (~2 minutes)
- **📦 Address Lookup Tables (ALT)**: Optimized transaction size for complex operations
- **🛡️ Error Handling**: Comprehensive error parsing with user-friendly messages

## 🛠️ Tech Stack

### Frontend Framework

- **Vite 5**: Fast build tool and development server
- **React 19**: Latest React with modern hooks and patterns
- **TypeScript**: Full type safety throughout the application

### Solana Integration

- **@solana/web3.js**: Solana JavaScript API
- **@solana/wallet-adapter-react**: Wallet connection components
- **@solana/wallet-adapter-react-ui**: Wallet UI components
- **@solana/wallet-adapter-wallets**: Multiple wallet support
- **@coral-xyz/anchor**: Solana program interaction framework
- **@solana/spl-token**: Token program utilities

### Development Tools

- **Package Manager**: pnpm (recommended)

## 🏗️ Project Structure

```
solana-dapp/
├── src/
│   ├── main.tsx                     # Application entry point
│   ├── pages/
│   │   └── index.tsx                # Main page component
│   ├── components/
│   │   ├── StakeTokens.tsx          # Staking input and logic
│   │   ├── UnstakeTokens.tsx        # Unstaking operations
│   │   ├── ClaimRewards.tsx         # Claim accumulated rewards
│   │   ├── StakeInfo.tsx            # Display stake information
│   │   ├── RewardHistory.tsx        # Reward totals and transaction history
│   │   ├── StakingActions.tsx       # Container for staking components
│   │   ├── StakingOptimizations.tsx # Advanced transaction options (Jito, ALT, Retry)
│   │   ├── ActionButton.tsx         # Shared button component
│   │   ├── TokenAmountInput.tsx     # Token amount input component
│   │   ├── StakeSuccessToast.tsx    # Success notification component
│   │   ├── ErrorModal.tsx           # Global error display
│   │   ├── WalletConnect.tsx        # Wallet connection component
│   │   └── CustomWallets/           # Custom wallet icons
│   ├── hooks/
│   │   ├── useStake.ts              # Staking logic and transaction handling
│   │   ├── useUnstake.ts            # Unstaking logic and transaction handling
│   │   ├── useClaimRewards.ts       # Claim rewards transaction handling
│   │   ├── useRewardHistory.ts      # Fetch reward and activity data from backend API
│   │   ├── useUserStakeInfo.ts      # User stake information fetching
│   │   ├── useStakeEvents.ts        # On-chain event listener
│   │   ├── useStakeValidation.ts    # Stake input validation
│   │   ├── useJitoStake.ts          # Jito bundle staking
│   │   ├── useStakeByLookupTable.ts # Address Lookup Table staking
│   │   ├── useTransactionRetry.ts   # Transaction retry with blockhash check
│   │   ├── usePriorityFee.ts        # Dynamic priority fee calculation
│   │   ├── useSignMessage.ts        # Wallet message signing
│   │   ├── useAutoSignOnConnect.ts  # Auto-sign on wallet connection
│   │   └── useProgram.ts            # Solana program connection
│   ├── adapters/                    # Custom wallet adapters
│   │   ├── BackpackWalletAdapter.ts # Backpack wallet support
│   │   ├── BinanceWalletAdapter.ts  # Binance wallet support
│   │   ├── CustomWalletAdapter.ts   # Custom wallet adapter base
│   │   └── walletAdapterUtils.ts    # Wallet adapter utilities
│   ├── styles/
│   │   ├── globals.css              # Global styles
│   │   └── wallet-adapter-override.css # Wallet adapter style overrides
│   ├── utils/
│   │   ├── tokenUtils.ts            # Token conversion utilities
│   │   ├── account.ts               # PDA and account creation utilities
│   │   ├── stakingUtils.ts          # Staking helper functions
│   │   ├── priorityFeeUtils.ts      # Priority fee utilities
│   │   ├── jitoUtils.ts             # Jito bundle utilities
│   │   ├── lookupTableUtils.ts      # Address Lookup Table utilities
│   │   └── programErrors.ts         # Program error parsing and display
│   ├── types/
│   │   └── lookupTable.ts           # Lookup table type definitions
│   ├── config/
│   │   └── solana.ts                # Solana network configuration
│   ├── providers/
│   │   └── WalletProvider.tsx       # Wallet provider wrapper
│   └── idl/
│       ├── idl.json                 # Program IDL (Interface Definition Language)
│       └── solana_staking.ts        # TypeScript types generated from IDL
├── scripts/
│   ├── mint-tokens.ts               # Token minting script for testing
│   ├── fund-rewards.ts              # Fund reward vault script
│   └── deployment-info.json         # Deployment configuration
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite configuration
└── README.md                        # Project documentation
```

## 🚀 Setup & Installation

### Prerequisites

- Node.js v22.12.0 or higher
- pnpm package manager
- Solana wallet (Phantom, Solflare, etc.) **configured for Testnet**
- **Testnet SOL tokens** - Get free tokens from [Solana Faucet](https://faucet.solana.com/) — **select "Testnet" in the network dropdown** (default is Devnet)

> **Note**: This DApp runs on **Solana Testnet** only. Make sure your wallet is connected to Testnet.

### 1. Clone Repository

```bash
git clone <repository-url>
cd evm-to-solana-contract/frontend/solana-dapp
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Get Test Tokens

**🚨 Important: You need tokens to test the staking functionality!**

Use the mint-token script to get test tokens to your wallet:

```bash
# 1. Update the TARGET_WALLET in scripts/mint-tokens.ts with your wallet address
# 2. Run the minting script
npx tsx scripts/mint-tokens.ts
```

This script will:

- Mint 1000 staking tokens to your wallet
- Mint 100 reward tokens to your wallet

**Note**: The script uses a test wallet for transaction fees. If the balance is not enough, you can send SOL to the wallet by using the [faucet](https://faucet.solana.com/). Make sure to update the `TARGET_WALLET` constant in the script with your actual wallet address.

### 4. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

### 5. Backend Service (required for Reward History)

The **Reward History** feature fetches data from a backend REST API that indexes on-chain events and calculates reward totals. You need to run the Solana backend service for this feature to work.

See [`backend/solana-backend/README.md`](../../backend/solana-backend/README.md) for setup instructions.

Once the backend is running, set the API base URL in your environment:

```bash
# In .env or .env.local
VITE_API_BASE_URL=http://localhost:3000
```

If the backend is not running, the rest of the DApp (staking, unstaking, claim rewards) will still function normally — only the Reward History panel will show an error.
