# Solana Backend

Solana 质押程序的后端服务，用于事件索引、数据查询和 API 服务。

## 项目简介

只读后端：从链上同步用户事件入库，按 PDA 查 pool/用户状态，返回 pending rewards 给前端。

主要功能：

- **事件索引**：从 Solana 链上获取并索引质押相关事件（Staked、Unstaked、RewardsClaimed、PoolCreated、RewardsFunded）
- **数据查询**：提供 pool 配置/状态、用户质押状态（含 pendingRewards）的查询接口
- **数据存储**：使用 SQLite 数据库存储同步状态和用户活动记录
- **定时同步**：自动定时同步链上事件数据

## 与合约的对应关系

合约模型为多池 + MasterChef 累积 reward：

- 一个 program 下可有多个 pool，每池由一个 `pool_id` (Pubkey) 区分
- `PoolConfig` PDA 存不可变配置（admin、staking_mint、reward_mint、reward_per_second）
- `PoolState` PDA 存累积状态（acc_reward_per_share、last_reward_time、total_staked、total_reward_debt）
- `UserStakeInfo` PDA 存每用户在某池下的 amount + reward_debt
- 后端按 `(programId, poolId)` 推导 PoolConfig PDA，作为 SyncStatus 主键

## 项目结构

```
solana-backend/
├── src/
│   ├── domain-models/           # PoolConfig, PoolState, UserStakeStatus, UserActivity, SyncStatus
│   ├── domain-services/         # RewardCalculationService (MasterChef pending reward)
│   ├── event-fetch/             # 事件解析 + FetchScheduler
│   ├── infrastructure/          # SolanaConnections + PrismaClient
│   ├── repositories/            # 链上 + DB 仓储
│   └── index.ts
├── scripts/
│   ├── db/init-db.ts            # 初始化 SyncStatus 记录
│   └── integration/
│       ├── getPool.ts                       # 查 pool config + state
│       ├── getUserStakePosition.ts          # 查用户状态 + pendingRewards
│       ├── event-fetch-integration.ts       # 全程序事件抓取测试
│       └── fetch-scheduler-integration.ts   # 定时同步测试
├── prisma/                      # Prisma schema
├── solana_staking.json          # Solana 程序 IDL（顶层副本）
├── src/solana_staking.json      # 同上，给运行时 import
├── package.json
├── tsconfig.json
└── README.md
```

## 项目安装

### 前置要求

- Node.js >= 18
- pnpm >= 8
- Solana CLI（可选）

### 安装步骤

1. **安装依赖**

```bash
pnpm install
```

2. **配置环境变量**

`.env` 示例：

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
POOL_ID=<pool_id_pubkey>
USER_ADDRESS=<user_wallet_address>

# 初始化 SyncStatus 用：'<poolConfigPda>:<initBlock>,...'
POOL_CONFIGS=<pool_config_pda>:<create_pool_slot>
DATABASE_URL=file:./dev.db
```

3. **初始化数据库**

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:init
```

## Scripts 运行前置条件

1. **部署合约 + 创建 pool**
   - 合约程序 ID 在 `solana_staking.json.address`
   - 至少调用一次 `create_pool` 拿到 pool_id 和 PoolConfig PDA
   - 至少有用户 stake 过

2. **必要参数**
   - `POOL_ID`: 创建池时使用的 pool_id (Pubkey base58)
   - `USER_ADDRESS`: 用户钱包地址

## 如何运行 Scripts

### 1. 查 Pool（替代旧 getGlobalState）

```bash
# env
export POOL_ID=<pool_id_pubkey>
pnpm tsx scripts/integration/getPool.ts

# cli
pnpm tsx scripts/integration/getPool.ts <poolId>
```

### 2. 查用户质押状态

```bash
# env
export USER_ADDRESS=<addr>
export POOL_ID=<pool_id_pubkey>
pnpm tsx scripts/integration/getUserStakePosition.ts

# cli
pnpm tsx scripts/integration/getUserStakePosition.ts <userAddress> <poolId>
```

### 3. 事件抓取

```bash
pnpm tsx scripts/integration/event-fetch-integration.ts
```

### 4. 定时同步

```bash
pnpm tsx scripts/integration/fetch-scheduler-integration.ts
# Ctrl+C 停止
```

## 常用命令

### 开发

```bash
pnpm dev      # 热重载
pnpm build    # tsc 编译
pnpm start    # 运行 dist
```

### 数据库

```bash
pnpm db:generate         # prisma generate
pnpm db:migrate          # prisma migrate dev
pnpm db:migrate:deploy   # 生产
pnpm db:init             # 插入 SyncStatus
pnpm db:studio           # 数据库 GUI
pnpm db:reset            # 重建
```

## 技术栈

- TypeScript
- Prisma (SQLite)
- @solana/web3.js
- @coral-xyz/anchor
- tsx

## 注意

1. `solana_staking.json` 必须与最新部署的合约 IDL 一致——程序 ID/账户/事件不一致会导致解码失败
2. `POOL_ID` 是 PoolConfig.pool_id 字段；`PoolConfig PDA` 是 `findProgramAddress(["pool_config", poolId], programId)` 推导出的地址。`SyncStatus.poolConfig` 字段存的是 PDA base58
3. 多池场景下，每个 pool 对应一条 `SyncStatus` 记录，FetchScheduler 并行处理所有池
4. Pending rewards 完全由后端按合约同款公式 `(amount * acc_reward_per_share / 1e12) - reward_debt` 投影计算

## 相关文档

- Solana 程序 IDL: `solana_staking.json`
- 数据库 Schema: `prisma/schema.prisma`
- 设计文档: `design.txt`（部分内容已过时——以代码为准）
