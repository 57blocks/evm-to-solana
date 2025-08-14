# Solana Staking DApp

A comprehensive staking DApp built for the Solana blockchain that demonstrates how to interact with Solana programs using modern Web3 technologies. This repository serves as a practical guide for developers learning to build decentralized applications on Solana.

## 🚀 Features

### Core Functionality

- **🔗 Wallet Integration**: Seamless Solana wallet connection using Wallet Adapter
- **📖 Program Reading**: Real-time reading of Solana program state
- **✍️ Program Writing**: Interactive program interactions including staking and unstaking operations
- **📊 Subgraph Integration**: Real-time event tracking and display of reward history
- **💡 Smart Transaction Flow**: Intelligent staking flow with proper error handling

### User Experience

- **Real-time Status Updates**: Live loading states for all blockchain operations
- **Automatic Transaction Flow**: Smart staking sequence with validation
- **Error Handling**: Comprehensive error display with user-friendly messages
- **Responsive Design**: Modern UI with smooth animations and mobile-friendly layout

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

### Data & State Management

- **React Query**: Server state management and caching
- **GraphQL**: Subgraph queries for blockchain events
- **CSS Modules**: Scoped styling with animations

### Development Tools

- **Node.js**: v22.10.0+ required
- **Package Manager**: npm, yarn, or pnpm supported

## 🏗️ Project Structure

```
solana-dapp/
├── src/
│   ├── components/
│   │   ├── StakeTokens.tsx          # Staking input and logic
│   │   ├── UnstakeTokens.tsx        # Unstaking operations
│   │   ├── StakeInfo.tsx            # Display stake information
│   │   ├── StakingActions.tsx       # Container for staking components
│   │   ├── RewardHistory.tsx        # Subgraph-based reward history
│   │   ├── ErrorModal.tsx           # Global error display
│   │   └── WalletConnectionButton.tsx # Solana wallet connection
│   ├── pages/
│   │   └── index.tsx                # Main application page
│   ├── styles/                      # CSS Modules for component styling
│   ├── utils/
│   │   └── tokenUtils.ts            # Token conversion utilities
│   ├── abi/                         # Program IDLs (Interface Definition Language)
│   └── wagmi.ts                     # Solana configuration
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── next.config.js                   # Next.js configuration
├── .env.example                     # Environment variables template
└── README.md                        # Project documentation
```

## 🚀 Setup & Installation

### Prerequisites

- Node.js v22.10.0 or higher
- npm, yarn, or pnpm package manager
- Solana wallet (Phantom, Solflare, etc.)
- Access to Solana network (devnet recommended for testing)

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

### 3. Environment Configuration

```bash
# Copy environment template
cp env.example .env.local
```

Update `.env.local` with your configuration:

```bash
# Solana RPC URL (default: devnet)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Solana Network (devnet, testnet, mainnet-beta)
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Graph API Key for subgraph queries (optional)
NEXT_PUBLIC_GRAPH_API_KEY=your_graph_api_key_here

# Graph URL for subgraph queries (optional)
NEXT_PUBLIC_GRAPH_URL=https://api.studio.thegraph.com/query/your_subgraph_id/version/latest
```

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

The DApp demonstrates reading program state using Solana web3.js:

```typescript
// Reading account data
const connection = new Connection(rpcUrl);
const accountInfo = await connection.getAccountInfo(publicKey);

// Reading program state
const programId = new PublicKey(PROGRAM_ID);
const stateAccount = await connection.getAccountInfo(statePublicKey);
```

### Program Writing

Interactive program operations with proper error handling:

```typescript
// Creating and sending transaction
const transaction = new Transaction();
transaction
  .add
  // Add your instruction here
  ();

const signature = await sendAndConfirmTransaction(connection, transaction, [
  wallet,
]);
```

### Transaction Flow Management

Smart staking sequence with validation:

```typescript
// Validate input before staking
if (validateStakeAmount(amount)) {
  // Create and send staking transaction
  await stakeTokens(amount, wallet, connection);
} else {
  throw new Error("Invalid stake amount");
}
```

## 📊 Subgraph Configuration

### What is a Subgraph?

A subgraph is a GraphQL API that indexes blockchain data, making it easy to query historical events and program state changes.

### Setting Up Your Subgraph

#### 1. Create Subgraph on The Graph

- Visit [The Graph Studio](https://thegraph.com/studio/)
- Create a new subgraph for your Solana project
- Note your Graph API key

#### 2. Define Subgraph Schema

Create a `schema.graphql` file:

```graphql
type RewardClaimed @entity {
  id: ID!
  user: String!
  reward: BigInt!
  slot: BigInt!
  timestamp: BigInt!
}
```

#### 3. Query from DApp

```typescript
const query = gql`
  {
    rewardClaimeds(orderBy: slot, orderDirection: desc) {
      id
      user
      reward
      slot
    }
  }
`;

const { data } = useQuery({
  queryKey: ["reward-history"],
  queryFn: () => request(url, query, {}, headers),
  refetchInterval: 30000, // Auto-refresh every 30 seconds
});
```

## 🔍 Key Learning Points

### 1. Wallet Connection with Solana Wallet Adapter

- Automatic wallet detection and connection
- Support for multiple Solana wallet providers
- Real-time connection state management

### 2. Program Interaction Patterns

- Reading program state with `getAccountInfo`
- Writing to programs with `sendAndConfirmTransaction`
- Transaction confirmation and error handling

### 3. Transaction Flow Management

- Input validation and error handling
- User feedback and loading states
- Proper error display and recovery

### 4. Subgraph Integration

- Real-time event tracking
- Historical data queries
- Automatic data refresh

### 5. State Management

- React Query for server state
- Local state for UI interactions
- Proper dependency management in useEffect

## 🧪 Testing

### Run Tests

```bash
npm run test
npm run test:watch
```

### Test Coverage

```bash
npm run test:coverage
```

## 📦 Build & Deploy

### Production Build

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Deploy to Vercel

```bash
npm run deploy
```

**Happy Building on Solana! 🚀**
