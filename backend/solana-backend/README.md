# Solana Backend

Backend service for the Solana staking program — event indexing, data querying, and API.

## Overview

Read-only backend: syncs user events from the chain into the database, queries pool/user state by PDA, and returns pending rewards to the frontend.

Key features:

- **Event indexing**: Fetches and indexes staking-related events from Solana (Staked, Unstaked, RewardsClaimed, PoolCreated, RewardsFunded)
- **Data querying**: Provides query interfaces for pool config/state and user stake status (including pendingRewards)
- **Data storage**: Uses SQLite to store sync status and user activity records
- **Scheduled sync**: Automatically syncs on-chain event data at a configured interval

## Contract Mapping

The contract uses a multi-pool MasterChef reward accumulation model:

- One program can have multiple pools, each identified by a `pool_id` (Pubkey)
- `PoolConfig` PDA stores immutable config (admin, staking_mint, reward_mint, reward_per_second)
- `PoolState` PDA stores accumulated state (acc_reward_per_share, last_reward_time, total_staked, total_reward_debt)
- `UserStakeInfo` PDA stores each user's amount + reward_debt per pool
- The backend derives the PoolConfig PDA from `(programId, poolId)` and uses it as the SyncStatus primary key

## Project Structure

```
solana-backend/
├── src/
│   ├── domain-models/           # PoolConfig, PoolState, UserStakeStatus, UserActivity, SyncStatus
│   ├── domain-services/         # RewardCalculationService (MasterChef pending reward)
│   ├── event-fetch/             # Event parsing + FetchScheduler
│   ├── infrastructure/          # SolanaConnections + PrismaClient
│   ├── repositories/            # On-chain + DB repositories
│   └── index.ts
├── scripts/
│   ├── db/init-db.ts            # Initialize SyncStatus records
│   └── integration/
│       ├── getPool.ts                       # Query pool config + state
│       ├── getUserStakePosition.ts          # Query user state + pendingRewards
│       ├── event-fetch-integration.ts       # Full program event fetch test
│       └── fetch-scheduler-integration.ts   # Scheduled sync test
├── prisma/                      # Prisma schema
├── solana_staking.json          # Solana program IDL (top-level copy)
├── src/solana_staking.json      # Same file, for runtime import
├── package.json
├── tsconfig.json
└── README.md
```

## Setup

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Solana CLI (optional)

### Installation

1. **Install dependencies**

```bash
pnpm install
```

2. **Configure environment variables**

`.env` example:

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
POOL_ID=<pool_id_pubkey>
USER_ADDRESS=<user_wallet_address>

# For SyncStatus initialization: '<poolConfigPda>:<initBlock>,...'
POOL_CONFIGS=<pool_config_pda>:<create_pool_slot>
DATABASE_URL=file:./dev.db
```

3. **Initialize the database**

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:init
```

## Script Prerequisites

1. **Deploy contract + create pool**
   - Program ID is in `solana_staking.json.address`
   - Call `create_pool` at least once to get a pool_id and PoolConfig PDA
   - At least one user must have staked

2. **Required parameters**
   - `POOL_ID`: The pool_id (Pubkey base58) used when creating the pool
   - `USER_ADDRESS`: User wallet address

## Running Scripts

### 1. Query Pool (replaces old getGlobalState)

```bash
# env
export POOL_ID=<pool_id_pubkey>
pnpm tsx scripts/integration/getPool.ts

# cli
pnpm tsx scripts/integration/getPool.ts <poolId>
```

### 2. Query User Stake Status

```bash
# env
export USER_ADDRESS=<addr>
export POOL_ID=<pool_id_pubkey>
pnpm tsx scripts/integration/getUserStakePosition.ts

# cli
pnpm tsx scripts/integration/getUserStakePosition.ts <userAddress> <poolId>
```

### 3. Event Fetch

```bash
pnpm tsx scripts/integration/event-fetch-integration.ts
```

### 4. Scheduled Sync

```bash
pnpm tsx scripts/integration/fetch-scheduler-integration.ts
# Ctrl+C to stop
```

## Common Commands

### Development

```bash
pnpm dev      # hot reload
pnpm build    # tsc compile
pnpm start    # run dist
```

### Database

```bash
pnpm db:generate         # prisma generate
pnpm db:migrate          # prisma migrate dev
pnpm db:migrate:deploy   # production migration
pnpm db:init             # insert SyncStatus records
pnpm db:studio           # database GUI
pnpm db:reset            # rebuild database
```

## Tech Stack

- TypeScript
- Prisma (SQLite)
- @solana/web3.js
- @coral-xyz/anchor
- tsx

## Notes

1. `solana_staking.json` must match the deployed contract IDL — mismatched program ID/accounts/events will cause decoding failures
2. `POOL_ID` is the PoolConfig.pool_id field; the `PoolConfig PDA` is derived via `findProgramAddress(["pool_config", poolId], programId)`. `SyncStatus.poolConfig` stores this PDA as base58
3. In multi-pool scenarios, each pool has one `SyncStatus` record; FetchScheduler processes all pools in parallel
4. Pending rewards are entirely calculated by the backend using the same formula as the contract: `(amount * acc_reward_per_share / 1e12) - reward_debt`

## Related Files

- Solana program IDL: `solana_staking.json`
- Database schema: `prisma/schema.prisma`
- Design notes: `design.txt` (partially outdated — defer to the code)
