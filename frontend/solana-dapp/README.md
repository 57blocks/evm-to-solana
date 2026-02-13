# Solana Staking DApp

A comprehensive staking DApp built for the Solana blockchain that demonstrates how to interact with Solana programs using modern Web3 technologies. This repository serves as a practical guide for developers learning to build decentralized applications on Solana.

> **⚠️ TESTNET ONLY**
>
> This application is deployed and runs exclusively on **Solana Testnet**. Due to the integration of the **Jito Bundle** feature for MEV protection, which requires specific validator infrastructure, we have chosen to launch on testnet for development and testing purposes.
>
> **You will need Testnet tokens to use this application:**
> - Get free Testnet SOL from the [Solana Faucet](https://faucet.solana.com/)
> - Mint test staking/reward tokens using the provided script (see below)

## 🚀 Features

### Core Functionality

- **🔗 Multi-Wallet Support**: Connect with Phantom, Solflare, Backpack, Binance, and more via Wallet Adapter
- **✍️ Sign Message**: Message signing for wallet authentication and verification
- **💰 Token Staking**: Stake tokens to earn rewards with real-time tracking
- **📊 Live Updates**: Real-time stake information and pending reward display
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

- **Node.js**: v22.12.0+ required (see .nvmrc)
- **Package Manager**: npm, yarn, or pnpm supported

## 🏗️ Project Structure

```
solana-dapp/
├── src/
│   ├── main.tsx                     # Application entry point
│   ├── App.tsx                      # Root application component
│   ├── components/
│   │   ├── StakeTokens.tsx          # Staking input and logic
│   │   ├── UnstakeTokens.tsx        # Unstaking operations
│   │   ├── StakeInfo.tsx            # Display stake information
│   │   ├── StakingActions.tsx       # Container for staking components
│   │   ├── ErrorModal.tsx           # Global error display
│   │   ├── WalletConnect.tsx        # Wallet connection component
│   │   └── WalletModal/             # Custom wallet modal components
│   ├── hooks/
│   │   ├── useStake.ts              # Staking logic and transaction handling
│   │   ├── useUnstake.ts            # Unstaking logic and transaction handling
│   │   ├── useUserStakeInfo.ts      # User stake information fetching
│   │   ├── usePriorityFee.ts        # Dynamic priority fee calculation
│   │   └── useProgram.ts            # Solana program connection
│   ├── adapters/                    # Custom wallet adapters
│   │   ├── BackpackWalletAdapter.ts # Backpack wallet support
│   │   └── BinanceWalletAdapter.ts  # Binance wallet support
│   ├── styles/                      # CSS Modules for component styling
│   ├── utils/
│   │   ├── tokenUtils.ts            # Token conversion utilities
│   │   ├── account.ts               # Account creation utilities
│   │   ├── priorityFeeUtils.ts      # Priority fee utilities
│   │   ├── jitoUtils.ts             # Jito bundle utilities
│   │   └── stakingUtils.ts          # Staking helper functions
│   ├── config/
│   │   └── solana.ts                # Solana network configuration
│   ├── providers/
│   │   └── WalletProvider.tsx       # Wallet provider wrapper
│   └── idl/
│       ├── idl.json                 # Program IDL (Interface Definition Language)
│       └── type.ts                  # TypeScript types for the program
├── scripts/
│   ├── mint-tokens.ts               # Token minting script for testing
│   └── deployment-info.json         # Deployment configuration
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite configuration
├── .nvmrc                           # Node.js version specification
└── README.md                        # Project documentation
```

## 🚀 Setup & Installation

### Prerequisites

- Node.js v22.12.0 or higher (see .nvmrc file)
- npm, yarn, or pnpm package manager
- Solana wallet (Phantom, Solflare, etc.) **configured for Testnet**
- **Testnet SOL tokens** - Get free tokens from [Solana Faucet](https://faucet.solana.com/)

> **Note**: This DApp runs on **Solana Testnet** only. Make sure your wallet is connected to Testnet.

### 1. Clone Repository

```bash
git clone <repository-url>
cd evm-to-solana-contract/frontend/solana-dapp
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
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
npm run dev
# or
yarn dev
# or
pnpm dev
```

The application will be available at `http://localhost:5173`

## 🔧 Solana Program Integration

### Program Reading

The DApp demonstrates reading program state using Anchor framework:

```typescript
// Reading program state
const state = await program.account.globalState.fetch(statePda);

// Reading user stake information
const userStakeInfo = await program.account.userStakeInfo.fetch(
  userStakeInfoPda
);
```

### Program Writing

Interactive program operations with proper error handling:

```typescript
// Staking tokens
const transaction = await program.methods
  .stake(new BN(convertToLamports(stakeAmount)))
  .partialAccounts({
    user: publicKey,
    state: statePda,
    userStakeInfo: userStakeInfoPda,
    // ... other accounts
  })
  .rpc();
```