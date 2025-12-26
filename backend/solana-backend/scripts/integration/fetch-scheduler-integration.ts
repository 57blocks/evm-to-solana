import "dotenv/config";
import StakingIDL from "../../solana_staking.json";
import { FetchScheduler, FetchSchedulerConfig } from "../../src/event-fetch/FetchScheduler";
import { SyncStatusRepository } from "../../src/repositories/implementations/SyncStatusRepository";
import { UserActivityRepository } from "../../src/repositories/implementations/UserActivityRepository";
import { UserActivity, EventType } from "../../src/domain-models";
import { SolanaConnections } from "../../src/infrastructure/SolanaConnections";
import { PermissionlessTransactionEventsParserFactory } from "../../src/event-fetch/permissionless/event";
import { SolanaEventFetcherConfig } from "../../src/event-fetch/chain/solana/solana";
import { CHAIN_ID } from "../../src/event-fetch/chain/chain";
import { getPrismaClient, disconnectPrisma } from "../../src/infrastructure/PrismaClient";

/**
 * FetchScheduler Integration Test Script
 * 
 * 功能：
 * 1. 使用真实的 repositories（SyncStatusRepository, UserActivityRepository）
 * 2. 初始化 FetchScheduler 配置
 * 3. 启动 FetchScheduler 并持续运行
 * 4. 支持优雅停止（Ctrl+C）
 * 
 * 注意：此脚本假设数据库已经初始化（通过 init-db.ts 脚本）
 * 使用真实的 SQLite 数据库进行测试
 * FetchScheduler 会持续运行，直到收到停止信号（SIGINT/SIGTERM）
 */

// 配置常量
const CHAIN_ID_VALUE = CHAIN_ID.SolanaDevnet;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const FETCHING_INTERVAL = 5000; // 5秒，用于测试
const RETRY_DELAY_INTERVAL = 1000; // 1秒
const MAX_RETRIES = 3;

// 获取程序地址
function getProgramAddress(): string {
  if (!StakingIDL.address) {
    throw new Error("solana_staking.json does not contain 'address' field");
  }
  return StakingIDL.address;
}

/**
 * 打印统计信息
 */
async function printStatistics(
  syncStatusRepo: SyncStatusRepository
): Promise<void> {
  const prisma = getPrismaClient();
  
  try {
    // 检查 SyncStatus 更新
    const updatedSyncStatuses = await syncStatusRepo.findAll();
    console.log("\n" + "=".repeat(80));
    console.log("Final Statistics");
    console.log("=".repeat(80));
    console.log(`\n[SyncStatus Results]`);
    console.log(`Total SyncStatus records: ${updatedSyncStatuses.length}`);
    updatedSyncStatuses.forEach((status) => {
      console.log(`  - Vault: ${status.vaultId}`);
      console.log(`    Last Sync Block: ${status.lastSyncBlock} (started from ${status.initializeBlock})`);
      console.log(`    Initialize Block: ${status.initializeBlock}`);
    });

    // 检查 UserActivity 保存
    const allActivityRecords = await prisma.userActivity.findMany({
      orderBy: { timestamp: 'desc' }
    });
    const allActivities = allActivityRecords.map(record => 
      new UserActivity(
        record.userAddress,
        record.vaultId,
        record.eventType as EventType,
        BigInt(record.positionDelta),
        BigInt(record.rewards),
        record.blockNumber,
        record.txHash,
        record.timestamp
      )
    );
    
    console.log(`\n[UserActivity Results]`);
    console.log(`Total UserActivity records: ${allActivities.length}`);
    
    if (allActivities.length > 0) {
      // 按类型统计
      const statsByType: Record<string, number> = {};
      allActivities.forEach((activity) => {
        statsByType[activity.eventType] = (statsByType[activity.eventType] || 0) + 1;
      });
      console.log(`\nActivity by type:`);
      Object.entries(statsByType).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });

      // 按 vault 统计
      const statsByVault: Record<string, number> = {};
      allActivities.forEach((activity) => {
        statsByVault[activity.vaultId] = (statsByVault[activity.vaultId] || 0) + 1;
      });
      console.log(`\nActivity by vault:`);
      Object.entries(statsByVault).forEach(([vault, count]) => {
        console.log(`  - ${vault}: ${count}`);
      });
    }
  } catch (error) {
    console.error("[Error] Failed to print statistics:", error);
  }
}



// 主测试函数
async function testFetchScheduler() {
  console.log("=".repeat(80));
  console.log("FetchScheduler Integration Test");
  console.log("=".repeat(80));

  try {
    // 1. 获取程序地址
    console.log("\n[Step 1] Loading configuration...");
    const programAddress = getProgramAddress();
    console.log(`[Info] Program address: ${programAddress}`);
    console.log(`[Info] Chain ID: ${CHAIN_ID_VALUE}`);
    console.log(`[Info] RPC URL: ${RPC_URL}`);
    const syncStatusRepo = new SyncStatusRepository();
    // 3. 创建真实的 repositories
    console.log("\n[Step 3] Creating repositories...");
    const userActivityRepo = new UserActivityRepository();

    // 4. 创建 FetchScheduler 配置
    console.log("\n[Step 4] Creating FetchScheduler configuration...");
    const solanaConnections = new SolanaConnections(RPC_URL);
    const eventParserFactory = new PermissionlessTransactionEventsParserFactory();

    const fetcherConfig: SolanaEventFetcherConfig = {
      slotToExclusion: 100,
      batchHours: 1,
      batchDays: 1,
      signaturesPerBatch: 1000,
      maxFetchedTransactionCount: 10000,
      sleepTime: 100,
      slotToCheck: 1000,
      promiseNumberForTransactions: 10,
    };

    const schedulerConfig: FetchSchedulerConfig = {
      fetchingInterval: FETCHING_INTERVAL,
      retryDelayInterval: RETRY_DELAY_INTERVAL,
      maxRetries: MAX_RETRIES,
      chainId: CHAIN_ID_VALUE,
      eventParserFactory: eventParserFactory,
      solanaConnections: solanaConnections,
      solanaEventFetcherConfig: fetcherConfig,
    };

    // 5. 创建 FetchScheduler 实例
    console.log("\n[Step 5] Creating FetchScheduler instance...");
    const scheduler = new FetchScheduler(
      syncStatusRepo,
      userActivityRepo,
      schedulerConfig
    );

    // 6. 启动 FetchScheduler（会立即执行一次同步）
    console.log("\n[Step 6] Starting FetchScheduler...");
    console.log("[Info] FetchScheduler will run continuously until stopped (Ctrl+C)");
    await scheduler.start();

    // 7. 设置优雅停止处理
    console.log("\n[Step 7] FetchScheduler is now running...");
    console.log("[Info] Press Ctrl+C to stop gracefully");
    console.log("=".repeat(80));

    // 设置信号处理器，优雅停止
    const stopHandler = async (signal: string) => {
      console.log(`\n\n[Info] Received ${signal}, stopping FetchScheduler gracefully...`);
      try {
        await scheduler.stop();
        console.log("[Info] FetchScheduler stopped successfully");
        await printStatistics(syncStatusRepo);
        console.log("\n" + "=".repeat(80));
        console.log("Script execution completed.");
        console.log("=".repeat(80));
        await disconnectPrisma();
        process.exit(0);
      } catch (error) {
        console.error("[Error] Error during graceful shutdown:", error);
        await disconnectPrisma();
        process.exit(1);
      }
    };

    process.on('SIGINT', () => stopHandler('SIGINT'));
    process.on('SIGTERM', () => stopHandler('SIGTERM'));

    // 保持进程运行
    // 使用一个永不 resolve 的 Promise 来保持进程运行
    await new Promise<void>(() => {
      // 这个 Promise 永远不会 resolve，进程会一直运行
      // 直到收到 SIGINT 或 SIGTERM 信号
    });

  } catch (error) {
    console.error("\n" + "=".repeat(80));
    console.error("Test failed with error:");
    console.error("=".repeat(80));
    console.error(error);
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    await disconnectPrisma();
    process.exit(1);
  }
}

// 运行测试
testFetchScheduler()
  .then(() => {
    console.log("\n[Info] Script execution completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[Error] Script execution failed:", error);
    process.exit(1);
  });
