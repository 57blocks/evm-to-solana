# 新增文章内容

> 以下内容需要插入到现有文章中。

---

## 修改 1：更新第 1 节"前端界面需实现的操作"

> 在第 1 节"业务逻辑与前端职责"中，原文"前端界面需实现的操作"部分，替换为：

前端界面需实现的操作：
- **stake**：发起用户质押 MyToken 的交易。
- **unstake**：发起用户赎回已质押资产的交易。
- **claimRewards**：发起领取累积奖励的交易。
- **getStakeInfo**：查询并显示用户当前的质押详情。
- **Reward History**：查询并展示用户的奖励与活动历史记录。

注：本 Demo 的重点在于展示"前端如何与 EVM / Solana 协议进行交互"的流程，不涉及奖励计算公式的具体设计。

---

## 修改 2：在 4.2.4 之后，新增 4.3 小节

### 4.3 Claim Rewards：领取奖励

在 Staking 协议中，用户累积的奖励需要主动领取。Claim 操作同样是一笔写入交易，但与 stake/unstake 不同的是，它不需要用户传入金额参数 — 合约会自动计算并发放所有待领取的奖励。

#### 4.3.1 EVM：一次合约调用

EVM 的 claimRewards 对前端来说非常简洁 — 无需传入任何参数，合约内部会自动从 storage 读取用户状态、计算待领取奖励并完成转账：

```typescript
const {
  writeContract,
  data: writeData,
  error: writeError,
} = useWriteContract();

// 领取奖励 — 无参数，合约自动计算
writeContract({
  address: STAKING_CONTRACT_ADDRESS,
  abi: stakingAbi,
  functionName: "claimRewards",
});
```

与 stake 操作对比，claimRewards 的前端调用更加简单：
- **无需 approve**：奖励是合约向用户转账，不涉及用户授权。
- **无需金额参数**：合约自动计算所有待领取奖励并一次性发放。
- **调用模式一致**：同样使用 Wagmi 的 `useWriteContract`，只是不需要 `args`。

#### 4.3.2 Solana：显式账户传递

Solana 的 claimRewards 同样不需要金额参数，但前端需要显式构建并传递所有相关账户：

**第一步：派生所有 PDA 和 Token 账户**

```typescript
const createStakingAccount = async (publicKey, program) => {
  const poolConfigPda = new PublicKey(deploymentInfo.poolConfigPda);
  const poolConfigAccount = await program.account.poolConfig.fetch(poolConfigPda);

  // 派生 PDA
  const [poolState] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_state"), poolConfigPda.toBuffer()],
    program.programId
  );
  const [userStakeInfo] = PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), poolConfigPda.toBuffer(), publicKey.toBuffer()],
    program.programId
  );
  const [rewardVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("reward_vault"), poolConfigPda.toBuffer()],
    program.programId
  );

  // 获取用户的 ATA
  const userRewardAccount = await getAssociatedTokenAddress(
    poolConfigAccount.rewardMint, publicKey
  );

  return { poolConfig: poolConfigPda, poolState, userStakeInfo, rewardVault, userRewardAccount };
};
```

**第二步：执行交易**

```typescript
const txSignature = await program.methods
  .claimRewards()
  .accountsPartial({
    user: publicKey,
    poolConfig: accountInfo.poolConfig,
    poolState: accountInfo.poolState,
    userStakeInfo: accountInfo.userStakeInfo,
    userRewardAccount: accountInfo.userRewardAccount,
    rewardVault: accountInfo.rewardVault,
  })
  .rpc();
```

#### 4.3.3 对比小结

| 方面 | EVM | Solana |
|------|-----|--------|
| 前端参数 | 无参数，一行调用 | 无金额参数，但需传入 5+ 个账户 |
| 账户准备 | 不需要 | 需要派生 PDA + 获取 ATA |
| 奖励计算位置 | 合约 storage 内完成 | Program 内完成，但账户数据需外部传入 |
| 复用性 | 独立调用 | 账户构建逻辑与 stake/unstake 共享 |

这里体现了 Solana "无状态 Program" 的核心设计：即使是一个不需要用户输入任何参数的操作，前端仍然需要明确告诉 Program "去哪些账户读写数据"。好处是 Solana 运行时可以并行处理不涉及相同账户的交易；代价是前端承担了更多的账户管理职责。

值得注意的是，Solana 侧的 `createStakingAccount` 函数在 stake、unstake、claimRewards 三个操作中被复用。这是 Solana DApp 开发中的常见模式 — 将 PDA 派生和账户解析抽象为工具函数，减少重复代码。

---

## 修改 3：在第 5 节之后，新增第 6 节

## 6. 历史数据查询

在 DApp 中，展示用户的历史操作记录（质押、解除质押、领取奖励）是常见的需求。这个场景揭示了 EVM 和 Solana 生态在**数据索引基础设施**上的根本差异。

### 6.1 EVM：The Graph Subgraph

EVM 生态拥有成熟的事件索引基础设施。The Graph 是事实标准 — 它监听链上合约事件，自动索引并提供 GraphQL 查询接口。前端只需编写查询语句，无需关心索引过程。

**定义 GraphQL 查询：**

```typescript
const query = gql`
  {
    rewardClaimeds(first: 10, orderBy: blockNumber, orderDirection: desc) {
      id
      user
      reward
      blockNumber
    }
  }
`;
```

**使用 TanStack Query 配合 graphql-request 查询：**

```typescript
const { data, refetch, isLoading } = useQuery({
  queryKey: ["reward-history"],
  async queryFn() {
    return await request(subgraphUrl, query);
  },
  refetchInterval: 30000,
  staleTime: 10000,
});
```

**特点：**
- **零后端**：The Graph 是去中心化的索引协议，前端直接查询 Subgraph。
- **声明式数据获取**：用 GraphQL 描述需要什么数据，Subgraph 负责如何获取。
- **事件天然持久化**：EVM 的 event logs 存储在区块链上，Subgraph 持续索引。

### 6.2 Solana：自建后端 Indexer + REST API

Solana 的 Program logs 不像 EVM 的 event logs 那样持久存储在链上，因此无法依赖类似 The Graph 的通用索引服务来查询历史事件。Solana 生态需要自建后端 Indexer 来补齐这一环。

#### 6.2.1 后端架构

我们的 Demo 采用了一个 NestJS 后端服务，核心包含三部分：

**1. Event Indexer（事件索引器）**

后端通过定时任务轮询链上交易，解析出业务事件并存入数据库：

```
CronJob 定时触发
  → 从 sync_status 表读取上次同步到的 slot
  → 调用 getSignaturesForAddress(poolConfigPDA) 获取新交易签名
  → 逐笔调用 getParsedTransaction 获取交易详情
  → 用 Anchor EventParser 从交易日志中解析出 Staked/Unstaked/RewardsClaimed 事件
  → 存入 user_activity 表
  → 更新 sync_status.lastSyncBlock
```

这里的关键是 **监控地址选择了 PoolConfig PDA** — 因为所有 stake/unstake/claimRewards 交易都会传入这个 PDA 作为账户，所以 `getSignaturesForAddress` 能捕获所有与该池子相关的交易。

**2. Reward API（奖励查询接口）**

后端提供 REST API 聚合链上实时数据与数据库历史数据：

```typescript
// GET /api/rewards/:userAddress
async getUserRewards(userAddress: string) {
  // 1. 从链上读取实时质押状态和待领取奖励（通过 RPC）
  const position = await userStakePositionRepository
    .getUserStakePosition(userAddress, programId, poolId);

  // 2. 从数据库查询历史领取记录
  const claimedActivities = await userActivityRepository
    .findByUserAndEventType(userAddress, poolConfig, "RewardsClaimed");

  // 3. 聚合返回
  return {
    totalStaked: position.amount,
    totalPendingRewards: position.pendingRewards,  // 链上实时计算
    totalClaimedRewards: totalClaimed,              // 数据库累计
    activities: allActivities,                      // 历史记录
  };
}
```

#### 6.2.2 前端调用

前端通过标准 REST 调用获取数据：

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function fetchRewards(userAddress: string) {
  const res = await fetch(`${API_BASE}/api/rewards/${userAddress}`);
  return res.json();
}

const rewards = useQuery({
  queryKey: ["reward-history", address],
  queryFn: () => fetchRewards(address),
  enabled: !!address,
  refetchInterval: 30000,
  staleTime: 10000,
});
```

返回数据不仅包含历史记录，还包含实时的质押状态和待领取奖励 — 这是因为后端同时查询了链上数据和数据库。

### 6.3 架构对比

| 方面 | EVM | Solana |
|------|-----|--------|
| 数据来源 | The Graph Subgraph | 自建后端 Indexer + 链上 RPC |
| 前端查询方式 | GraphQL | REST API |
| 索引方式 | Subgraph 自动监听合约事件 | 后端定时轮询 `getSignaturesForAddress` |
| 数据持久性 | 事件日志永久存储在链上 | Program logs 不持久化，需主动索引 |
| 后端依赖 | 无需自建后端 | 需要后端服务 + 数据库 |
| 数据内容 | 仅历史事件 | 实时链上状态 + 历史事件聚合 |
| 实时性 | Subgraph 近实时索引 | 取决于后端 Cron 频率 |
| 部署成本 | The Graph 托管或自建节点 | 服务器 + 数据库 + RPC 节点 |

### 6.4 小结

历史数据查询是 EVM 和 Solana 前端开发差异最显著的场景之一：

- **EVM** 拥有成熟的索引生态（The Graph），前端可以"零后端"直接查询链上历史事件。这得益于 EVM 的 event logs 是链上持久化存储的一等公民。
- **Solana** 的 Program logs 是临时性的，历史数据查询必须依赖自建的后端 Indexer。这意味着 Solana DApp 的"全栈"复杂度天然更高 — 前端开发者不仅要处理链上交互，还需要一个后端服务来弥补链上数据索引的缺失。

这也解释了为什么 Solana 生态中 Helius、Triton 等第三方索引服务越来越重要 — 它们正在尝试填补 Solana 在这一层面的基础设施空白。

---

## 修改 4：更新总结（原第 6 节改为第 7 节）

## 7. 总结

通过这个 Staking Demo，我们把前两篇中的理论与抽象机制落到了一个具体的前端实现上，可以清晰地看到：

**钱包接入：**
- EVM：一个主流钱包（MetaMask）+ 标准组件即可；
- Solana：多钱包生态，Wallet Adapter 抽象层必不可少。

**状态读取：**
- EVM：ABI + 合约地址 + 函数名；
- Solana：IDL + PDA + 账户结构，借助 Anchor 可获得接近 ABI 的开发体验。

**交易写入：**
- EVM：approve → stake 典型双交易流程；claimRewards 则是无参数的单次调用；
- Solana：利用账户模型和用户签名，一笔交易即可完成授权与转账，但每笔交易都需要前端显式构建和传递所有相关账户。

**事件处理：**
- EVM：logs 持久化，天然适合做"实时 + 历史"结合；
- Solana：program logs 偏实时，历史依赖索引服务。

**历史数据查询：**
- EVM：依托 The Graph 等成熟索引基础设施，前端可零后端直接查询；
- Solana：需要自建后端 Indexer 轮询链上交易并持久化，前端通过 REST API 获取聚合数据。

结合前言、合约篇、前端（第一部分）以及本篇实战，你已经拥有了一条从概念理解 → 合约迁移 → 前端适配 → 完整 Demo 的完整路径。通过将手续费优化、交易重试、优先费与错误分层处理等能力系统性地集成进前端工程，这套方法论本身就已经构成了一套可直接用于生产环境的 Solana DApp 前端基础设施。
