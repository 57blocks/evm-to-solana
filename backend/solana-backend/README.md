# Solana Backend

Solana 质押程序的后端服务，用于事件索引、数据查询和 API 服务。

## 项目简介

本项目是一个 TypeScript 后端服务，主要功能包括：

- **事件索引**：从 Solana 链上获取并索引质押相关事件（Stake、Unstake、RewardsClaimed）
- **数据查询**：提供全局状态和用户质押状态的查询接口
- **数据存储**：使用 SQLite 数据库存储同步状态和用户活动记录
- **定时同步**：自动定时同步链上事件数据

## 项目结构

```
solana-backend/
├── src/                          # 源代码目录
│   ├── domain-models/           # 领域模型（实体定义）
│   ├── event-fetch/             # 事件获取模块
│   ├── infrastructure/          # 基础设施（数据库、连接等）
│   ├── repositories/            # 数据访问层
│   └── index.ts                 # 入口文件
├── scripts/                     # 脚本目录
│   ├── db/                      # 数据库相关脚本
│   └── integration/             # 集成测试脚本
│       ├── getGlobalState.ts    # 获取全局状态测试
│       ├── getUserStakePosition.ts  # 获取用户质押状态测试
│       ├── event-fetch-integration.ts  # 事件获取测试
│       └── fetch-scheduler-integration.ts  # 定时同步测试
├── prisma/                      # Prisma 数据库 schema
├── solana_staking.json          # Solana 程序 IDL
├── package.json
├── tsconfig.json
└── README.md
```

## 项目安装

### 前置要求

- Node.js >= 18
- pnpm >= 8
- Solana CLI（可选，用于部署合约）

### 安装步骤

1. **安装依赖**

```bash
pnpm install
```

2. **配置环境变量**

创建 `.env` 文件（可选，脚本会使用默认值）：

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
STAKING_MINT=<your_staking_mint_address>
USER_ADDRESS=<your_user_address>
```

3. **初始化数据库**

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:init
```

## Scripts 运行前置条件

在运行集成测试脚本之前，需要确保：

1. **部署 Solana Staking 合约**
   - 合约需要部署到 Solana 网络（devnet 或 mainnet）
   - 合约地址需要在 `solana_staking.json` 中配置

2. **进行质押操作**
   - 至少进行一次 `stake` 操作以创建全局状态
   - 至少进行一次用户质押操作以创建用户质押记录
   - 详情请参考 `solana-staking` 合约部分

3. **准备必要参数**
   - `STAKING_MINT`: 质押代币的 mint 地址
   - `USER_ADDRESS`: 用户钱包地址（用于查询用户质押状态）

## 如何运行 Scripts

### 1. 获取全局状态

查询质押程序的全局状态信息：

```bash
# 方式1：使用环境变量
export STAKING_MINT=<staking_mint_address>
pnpm tsx scripts/integration/getGlobalState.ts

# 方式2：使用命令行参数
pnpm tsx scripts/integration/getGlobalState.ts <stakingMint>
```

### 2. 获取用户质押状态

查询指定用户的质押状态：

```bash
# 方式1：使用环境变量
export USER_ADDRESS=<user_address>
export STAKING_MINT=<staking_mint_address>
pnpm tsx scripts/integration/getUserStakePosition.ts

# 方式2：使用命令行参数
pnpm tsx scripts/integration/getUserStakePosition.ts <userAddress> <stakingMint>
```

### 3. 事件获取测试

测试从链上获取事件：

```bash
pnpm tsx scripts/integration/event-fetch-integration.ts
```

### 4. 定时同步测试

测试定时同步功能（会持续运行直到手动停止）：

```bash
pnpm tsx scripts/integration/fetch-scheduler-integration.ts
# 按 Ctrl+C 停止
```

## 常用命令

### 开发

```bash
# 开发模式（热重载）
pnpm dev

# 构建项目
pnpm build

# 运行生产构建
pnpm start
```

### 数据库

```bash
# 生成 Prisma Client
pnpm db:generate

# 运行数据库迁移
pnpm db:migrate

# 部署数据库迁移（生产环境）
pnpm db:migrate:deploy

# 初始化数据库
pnpm db:init

# 打开 Prisma Studio（数据库可视化工具）
pnpm db:studio

# 重置数据库
pnpm db:reset
```

### 运行脚本

```bash
# 使用 pnpm script 命令运行脚本
pnpm script scripts/integration/getGlobalState.ts

# 或直接使用 tsx
pnpm tsx scripts/integration/getGlobalState.ts
```

## 技术栈

- **TypeScript**: 类型安全的 JavaScript
- **Prisma**: 数据库 ORM
- **SQLite**: 轻量级数据库
- **@solana/web3.js**: Solana 区块链交互
- **@coral-xyz/anchor**: Anchor 框架支持
- **tsx**: TypeScript 执行器

## 注意事项

1. 确保 `solana_staking.json` 中的程序地址正确
2. 运行脚本前确保网络连接正常，可以访问 Solana RPC 节点
3. 数据库文件会保存在项目根目录，注意备份
4. 生产环境建议使用更稳定的 RPC 节点

## 相关文档

- Solana 程序 IDL: `solana_staking.json`
- 数据库 Schema: `prisma/schema.prisma`
- 设计文档: `design.txt`
