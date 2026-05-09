import { ConfigService } from "@nestjs/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { encodeAbiParameters, encodeEventTopics } from "viem";
import { PoolBalanceMonitorService } from "./autotask/pool-balance-monitor.service";
import { SyncStatus } from "./domain-models";
import { FetchScheduler } from "./event-fetch/FetchScheduler";
import { PrismaClient } from "./generated/prisma/client";
import { AlertRepository } from "./repositories/implementations/AlertRepository";
import { SyncStatusRepository } from "./repositories/implementations/SyncStatusRepository";
import { UserActivityRepository } from "./repositories/implementations/UserActivityRepository";

const stakingAddress = "0x67bebacfb97f13e1b33510309b74a0503695d0f3";
const rewardTokenAddress = "0xb31198aabbdb66365c211a26d7da1aeea8099fca";
const ownerAddress = "0x0000000000000000000000000000000000000001";

function rewardsFundedLog() {
  return {
    address: stakingAddress,
    blockNumber: 101n,
    transactionHash:
      "0x0000000000000000000000000000000000000000000000000000000000000101",
    logIndex: 7,
    data: encodeAbiParameters([{ type: "uint256" }], [500n]),
    topics: encodeEventTopics({
      abi: [
        {
          type: "event",
          name: "RewardsFunded",
          inputs: [
            { indexed: true, name: "funder", type: "address" },
            { indexed: false, name: "amount", type: "uint256" },
          ],
        },
      ],
      eventName: "RewardsFunded",
      args: { funder: ownerAddress },
    }),
  };
}

async function createSchema(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE sync_status (
      pool_key TEXT PRIMARY KEY,
      chain_id INTEGER NOT NULL,
      contract_address TEXT NOT NULL,
      reward_token_address TEXT NOT NULL,
      name TEXT NOT NULL,
      last_synced_block INTEGER NOT NULL,
      initialize_block INTEGER NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE user_activity (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
      chain_id INTEGER NOT NULL,
      contract_address TEXT NOT NULL,
      user_address TEXT NOT NULL,
      event_type TEXT NOT NULL,
      amount TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      tx_hash TEXT NOT NULL,
      log_index INTEGER NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX user_activity_tx_hash_log_index_key
    ON user_activity(tx_hash, log_index)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE alert (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))),
      pool_key TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      message TEXT NOT NULL,
      threshold TEXT NOT NULL,
      actual_value TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      resolved BOOLEAN NOT NULL DEFAULT false
    )
  `);
}

describe("evm-backend normal path", () => {
  let prisma: PrismaClient;
  const dbPath = `/private/tmp/evm-backend-normal-path-${process.pid}.db`;

  beforeEach(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: dbPath }),
    });
    await createSchema(prisma);
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it("indexes EVM events, advances sync status, and stores low balance alerts", async () => {
    const syncStatusRepository = new SyncStatusRepository(prisma);
    const userActivityRepository = new UserActivityRepository(prisma);
    const alertRepository = new AlertRepository(prisma);
    const syncStatus = new SyncStatus({
      poolKey: `11155111:${stakingAddress}`,
      chainId: 11155111,
      contractAddress: stakingAddress,
      rewardTokenAddress,
      name: "sepolia-staking",
      lastSyncedBlock: 100,
      initializeBlock: 100,
    });
    await syncStatusRepository.save(syncStatus);

    const evmClient = {
      getBlockNumber: jest.fn().mockResolvedValue(101n),
      getLogs: jest.fn().mockResolvedValue([rewardsFundedLog()]),
      getBlock: jest.fn().mockResolvedValue({ timestamp: 123456n }),
    };
    const fetchScheduler = new FetchScheduler(
      syncStatusRepository,
      userActivityRepository,
      { getClient: jest.fn().mockReturnValue(evmClient) } as never,
      {
        retryDelayInterval: 0,
        maxRetries: 0,
        blockChunkSize: 100,
        confirmationBlocks: 0,
      }
    );

    await fetchScheduler.runOnce();

    const activities = await prisma.userActivity.findMany();
    expect(activities).toEqual([
      expect.objectContaining({
        chainId: 11155111,
        contractAddress: stakingAddress,
        userAddress: ownerAddress,
        eventType: "RewardsFunded",
        amount: "500",
        blockNumber: 101,
        logIndex: 7,
        timestamp: 123456,
      }),
    ]);
    await expect(prisma.syncStatus.findUniqueOrThrow({
      where: { poolKey: syncStatus.poolKey },
    })).resolves.toMatchObject({ lastSyncedBlock: 101 });

    const balanceMonitor = new PoolBalanceMonitorService(
      new ConfigService({
        POOL_BALANCE_MONITOR_CRON: "0 */5 * * * *",
        BALANCE_THRESHOLD: "1000",
      }),
      { addCronJob: jest.fn() } as never,
      syncStatusRepository,
      { getBalance: jest.fn().mockResolvedValue(99n) } as never,
      alertRepository
    );
    await balanceMonitor.tick();

    await expect(prisma.alert.findMany()).resolves.toEqual([
      expect.objectContaining({
        poolKey: syncStatus.poolKey,
        alertType: "LOW_REWARD_BALANCE",
        threshold: "1000",
        actualValue: "99",
        resolved: false,
      }),
    ]);
  });
});
