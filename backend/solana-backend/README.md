# Solana Backend

Backend service for the Solana staking program — scheduled event indexing, data querying utilities, and reward vault monitoring.

## Overview

Read-only backend: runs scheduled jobs to sync user events from the chain into the database, queries pool/user state by PDA, calculates pending rewards, and records reward vault balance alerts.

Key features:

- **Event indexing**: Fetches and indexes staking-related events from Solana (Staked, Unstaked, RewardsClaimed, PoolCreated, RewardsFunded)
- **Data querying**: Provides query interfaces for pool config/state and user stake status (including pendingRewards)
- **Data storage**: Uses SQLite to store sync status, user activity, and alert records
- **Scheduled sync**: Automatically syncs on-chain event data using `INDEXING_CRON`
- **Reward vault monitoring**: Checks reward vault balances using `POOL_BALANCE_MONITOR_CRON`

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
│   ├── autotask/                # Reward vault balance monitor + alert repository
│   ├── config/                  # Nest config schema and defaults
│   ├── domain-models/           # PoolConfig, PoolState, UserStakeStatus, UserActivity, SyncStatus
│   ├── domain-services/         # RewardCalculationService (MasterChef pending reward)
│   ├── event-fetch/             # Event parsing + FetchScheduler
│   ├── generated/               # Generated Prisma client
│   ├── indexer/                 # Nest scheduled event indexing service
│   ├── infrastructure/          # SolanaConnections + PrismaClient
│   ├── repositories/            # Repository interfaces + implementations
│   ├── app.module.ts            # Nest application module
│   └── main.ts                  # Application entrypoint
├── scripts/
│   ├── db/init-db.ts            # Initialize SyncStatus records
│   └── integration/
│       ├── getPool.ts                       # Query pool config + state
│       ├── getUserStakePosition.ts          # Query user state + pendingRewards
│       ├── event-fetch-integration.ts       # Full program event fetch test
│       └── fetch-scheduler-integration.ts   # Scheduled sync test
├── prisma/                      # Prisma schema and SQLite database file
├── specs/                       # Design notes and backend spec
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Setup

### Prerequisites

- Node.js 20.19+ / 22.12+ / 24+
- pnpm 10.6.3+
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
PROGRAM_ID=<program_id>
CHAIN_ID=901
POOL_ID=<pool_id_pubkey>
USER_ADDRESS=<user_wallet_address>

# For SyncStatus initialization: '<poolConfigPda>:<initBlock>,...'
POOL_CONFIGS=<pool_config_pda>:<create_pool_slot>
DATABASE_URL=file:./prisma/dev.db

# Scheduled jobs
INDEXING_CRON=*/10 * * * * *
INDEXING_RETRY_DELAY_MS=1000
INDEXING_MAX_RETRIES=3
POOL_BALANCE_MONITOR_CRON=0 */5 * * * *
REWARD_BALANCE_THRESHOLD=1000000

# Optional Solscan fallback/config
SOLSCAN_API_KEY=
SOLSCAN_ENDPOINT=
```

3. **Initialize the database**

```bash
pnpm db:generate
pnpm db:push
pnpm db:init
```

## Docker

### Build Image

Build the backend image from the backend project directory:

```bash
cd backend/solana-backend
docker build -t solana-backend .
```

### Configure Environment

Create `.env` from `.env.example` and fill in the required values before starting the container:

```bash
cp .env.example .env
```

For Docker, keep the SQLite database under `/app/prisma` so it is persisted by the compose volume:

```bash
DATABASE_URL="file:./prisma/dev.db"
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=<program_id>
POOL_CONFIGS=<pool_config_pda_base58>:<create_pool_slot>
```

### Run with Docker

```bash
docker run --env-file .env \
  -v "$(pwd)/prisma:/app/prisma" \
  --name solana-backend \
  solana-backend
```

Initialize or update the database schema before the first run if needed:

```bash
docker run --rm --env-file .env \
  -v "$(pwd)/prisma:/app/prisma" \
  solana-backend ./node_modules/.bin/prisma db push

docker run --rm --env-file .env \
  -v "$(pwd)/prisma:/app/prisma" \
  solana-backend node dist/scripts/db/init-db.js
```

### Run with Docker Compose

Build the image after changing `Dockerfile`, `package.json`, or source files:

```bash
docker compose build solana-backend
```

Initialize or update the database schema before the first startup. In Docker, use the compiled init script under `dist/`; do not run `pnpm db:init` because the runtime image does not include the source `scripts/` directory.

```bash
docker compose run --rm solana-backend ./node_modules/.bin/prisma db push
docker compose run --rm solana-backend node dist/scripts/db/init-db.js
```

Start the backend service:

```bash
docker compose up --build -d
```

Useful compose commands:

```bash
docker compose logs -f solana-backend
docker compose run --rm solana-backend ./node_modules/.bin/prisma db push
docker compose run --rm solana-backend node dist/scripts/db/init-db.js
docker compose down
```

## Script Prerequisites

1. **Deploy contract + create pool**
   - Program ID is in `idl/solana_staking.json` (`.address` field)
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
pnpm test     # run Jest tests
```

### Database

```bash
pnpm db:generate         # prisma generate (generate Prisma client)
pnpm db:push             # prisma db push (sync schema to local db)
pnpm db:init             # insert SyncStatus records
pnpm db:studio           # database GUI
```

## Tech Stack

- TypeScript
- Prisma (SQLite)
- @solana/web3.js
- @coral-xyz/anchor
- tsx

## Notes

1. `idl/solana_staking.json` (project root) must match the deployed contract IDL — mismatched program ID/accounts/events will cause decoding failures
2. `POOL_ID` is the PoolConfig.pool_id field; the `PoolConfig PDA` is derived via `findProgramAddress(["pool_config", poolId], programId)`. `SyncStatus.poolConfig` stores this PDA as base58
3. In multi-pool scenarios, each pool has one `SyncStatus` record; FetchScheduler processes all pools in parallel
4. Pending rewards are entirely calculated by the backend using the same formula as the contract: `(amount * acc_reward_per_share / 1e12) - reward_debt`

## Related Files

- Solana program IDL: `idl/solana_staking.json`
- Database schema: `prisma/schema.prisma`
- Backend spec: `specs/backend.spec`
- Design notes: `specs/design.txt` (partially outdated — defer to the code)
