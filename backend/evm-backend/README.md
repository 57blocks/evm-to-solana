# EVM Backend

NestJS backend for indexing Sepolia staking contract events into SQLite and monitoring RewardToken balances.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:push
pnpm db:init
pnpm start:dev
```

`POOL_CONFIGS` seeds one `sync_status` row per staking pool. Set `startBlock` to the deployment block for the staking contract; `db:init` stores `lastSyncedBlock = startBlock - 1`.

## Docker

Build the image after changing `Dockerfile`, `package.json`, or source files:

```bash
docker compose build evm-backend
```

Initialize or update the database schema before the first startup. In Docker, use the compiled init script under `dist/`; do not run `pnpm db:init` because the runtime image does not include the source `scripts/` directory.

```bash
docker compose run --rm evm-backend ./node_modules/.bin/prisma db push
docker compose run --rm evm-backend node dist/scripts/db/init-db.js
```

Start the backend service:

```bash
docker compose up -d
```

Useful compose commands:

```bash
docker compose logs -f evm-backend
docker compose run --rm evm-backend ./node_modules/.bin/prisma db push
docker compose run --rm evm-backend node dist/scripts/db/init-db.js
docker compose down
```

## ABI Refresh

After rebuilding the Foundry contracts, refresh committed ABI artifacts:

```bash
cp contract/evm-staking/out/Staking.sol/Staking.json backend/evm-backend/abi/
cp contract/evm-staking/out/RewardToken.sol/RewardToken.json backend/evm-backend/abi/
```

The backend only reads ABI files from `backend/evm-backend/abi`.

## Test

```bash
pnpm test
```
