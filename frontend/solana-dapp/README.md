# Solana Staking DApp

A comprehensive staking DApp built for the Solana blockchain that demonstrates how to interact with Solana programs using modern Web3 technologies. This repository serves as a practical guide for developers learning to build decentralized applications on Solana.

## 🚀 Features

### Core Functionality

- **🔗 Wallet Integration**: Seamless Solana wallet connection using Wallet Adapter
- **📖 Program Reading**: Real-time reading of Solana program state and user stake information
- **✍️ Program Writing**: Interactive program interactions including staking and unstaking operations
- **📊 Real-time Updates**: Live stake information and reward tracking
- **💡 Smart Transaction Flow**: Intelligent staking flow with proper error handling and validation
- **🛡️ Input Validation**: Built-in validation for token amounts and user inputs

## 🛠️ Tech Stack

### Frontend Framework

- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with modern hooks and patterns
- **TypeScript**: Full type safety throughout the application

### Solana Integration

- **@solana/web3.js**: Solana JavaScript API
- **@solana/wallet-adapter-react**: Wallet connection components
- **@solana/wallet-adapter-react-ui**: Wallet UI components
- **@solana/wallet-adapter-wallets**: Multiple wallet support
- **@coral-xyz/anchor**: Solana program interaction framework
- **@solana/spl-token**: Token program utilities

### Data & State Management

- **React Query**: Server state management and caching
- **CSS Modules**: Scoped styling with animations

### Development Tools

- **Node.js**: v22.12.0+ required (see .nvmrc)
- **Package Manager**: npm, yarn, or pnpm supported

## 🏗️ Project Structure

```
solana-dapp/
├── src/
│   ├── components/
│   │   ├── StakeTokens.tsx          # Staking input and logic with useStake hook
│   │   ├── UnstakeTokens.tsx        # Unstaking operations with useUnstake hook
│   │   ├── StakeInfo.tsx            # Display stake information with useUserStakeInfo hook
│   │   ├── StakingActions.tsx       # Container for staking components
│   │   ├── RewardHistory.tsx        # Reward history display
│   │   ├── ErrorModal.tsx           # Global error display
│   │   ├── WalletButton.tsx         # Solana wallet connection
│   │   └── DynamicWalletButton.tsx  # Dynamic wallet button component
│   ├── hooks/
│   │   ├── useStake.ts              # Staking logic and transaction handling
│   │   ├── useUnstake.ts            # Unstaking logic and transaction handling
│   │   ├── useUserStakeInfo.ts      # User stake information fetching
│   │   └── useProgram.ts            # Solana program connection
│   ├── pages/
│   │   └── index.tsx                # Main application page
│   ├── styles/                      # CSS Modules for component styling
│   ├── utils/
│   │   ├── tokenUtils.ts            # Token conversion utilities and validation
│   │   └── account.ts               # Account creation utilities
│   ├── config/
│   │   └── solana.ts                # Solana network configuration
│   ├── providers/
│   │   └── WalletProvider.tsx       # Wallet provider wrapper
│   └── idl/
│       ├── idl.json                 # Program IDL (Interface Definition Language)
│       └── type.ts                  # TypeScript types for the program
├── scripts/
│   ├── mint-tokens.ts               # Token minting script for testing
│   └── deployment-info.json        # Deployment configuration
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── next.config.js                   # Next.js configuration
├── .nvmrc                           # Node.js version specification
└── README.md                        # Project documentation
```

## 🚀 Setup & Installation

### Prerequisites

- Node.js v22.12.0 or higher (see .nvmrc file)
- npm, yarn, or pnpm package manager
- Solana wallet (Phantom, Solflare, etc.)
- Access to Solana network (devnet recommended for testing)
- Get devnet solana tokens for testing to [faucet](https://faucet.solana.com/)

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
- Create the necessary token accounts automatically

**Note**: The script uses a test wallet for transaction fees. If the balance is not enough, you can send SOL to the wallet by using the [faucet](https://faucet.solana.com/). Make sure to update the `TARGET_WALLET` constant in the script with your actual wallet address.

### 4. Start Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The application will be available at `http://localhost:3000`

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
  .accounts({
    user: publicKey,
    state: statePda,
    userStakeInfo: userStakeInfoPda,
    // ... other accounts
  })
  .rpc();
```

## 🪙 Token Minting Script

### Purpose

The `scripts/mint-tokens.ts` script is essential for testing the staking functionality. It mints both staking and reward tokens to your wallet address.

### How to Use

1. **Update Target Wallet**: Open `scripts/mint-tokens.ts` and change the `TARGET_WALLET` constant to your wallet address:

```typescript
const TARGET_WALLET = "your wallet address here";
```

2. **Run the Script**:

```bash
npx tsx scripts/mint-tokens.ts
```

### Security Notes

- The script uses a test wallet with hardcoded private keys for development
- Never use this wallet for production or with real funds
- The private key is only for paying transaction fees during minting
- Always use environment variables for production deployments

## 🔍 Key Learning Points

### 1. Wallet Connection with Solana Wallet Adapter

- Automatic wallet detection and connection
- Support for multiple Solana wallet providers
- Real-time connection state management

### 2. Program Interaction Patterns

- Reading program state with Anchor framework
- Writing to programs with `program.methods`
- Transaction confirmation and error handling
- Type-safe account mapping with proper TypeScript integration
- Extracting and parsing on-chain events from transaction logs

## 🚨 Important Notes

1. **Test Tokens Required**: You must run the mint-token script to get tokens before testing staking functionality
2. **Devnet Only**: This DApp is configured for Solana devnet for testing purposes
3. **Test Wallet**: The minting script uses a test wallet - never use it for real funds
4. **Program Deployment**: The staking program is already deployed on devnet with the addresses in `deployment-info.json`
5. **Node.js Version**: Use Node.js v22.12.0+ as specified in .nvmrc

**Happy Building on Solana! 🚀**
