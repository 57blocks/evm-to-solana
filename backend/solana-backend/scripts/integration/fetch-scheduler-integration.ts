import "dotenv/config";
import StakingIDL from "../../idl/solana_staking.json";
import { FetchScheduler, FetchSchedulerConfig } from "../../src/event-fetch/FetchScheduler";
import { SyncStatusRepository } from "../../src/repositories/implementations/SyncStatusRepository";
import { UserActivityRepository } from "../../src/repositories/implementations/UserActivityRepository";
import { UserActivity, EventType } from "../../src/domain-models";
import { SolanaConnections } from "../../src/infrastructure/SolanaConnections";
import { UserTransactionEventsParserFactory } from "../../src/event-fetch/user/event";
import { SolanaEventFetcherConfig } from "../../src/event-fetch/chain/solana/solana";
import { CHAIN_ID } from "../../src/event-fetch/chain/chain";
import { getPrismaClient, disconnectPrisma } from "../../src/infrastructure/PrismaClient";

/**
 * FetchScheduler Integration Test Script
 * 
 * Features:
 * 1. Uses real repositories (SyncStatusRepository, UserActivityRepository)
 * 2. Initializes FetchScheduler configuration
 * 3. Starts FetchScheduler and keeps it running
 * 4. Supports graceful shutdown (Ctrl+C)
 *
 * Note: This script assumes the database is already initialized (via init-db.ts).
 * Uses a real SQLite database for testing.
 * FetchScheduler runs continuously until it receives a stop signal (SIGINT/SIGTERM).
 */

// Configuration constants
const CHAIN_ID_VALUE = CHAIN_ID.SolanaDevnet;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const FETCHING_INTERVAL = 5000; // 5 seconds, for testing
const RETRY_DELAY_INTERVAL = 1000; // 1 second
const MAX_RETRIES = 3;

// Get program address
function getProgramAddress(): string {
  if (!StakingIDL.address) {
    throw new Error("solana_staking.json does not contain 'address' field");
  }
  return StakingIDL.address;
}

/**
 * Print final statistics.
 */
async function printStatistics(
  syncStatusRepo: SyncStatusRepository
): Promise<void> {
  const prisma = getPrismaClient();
  
  try {
    const updatedSyncStatuses = await syncStatusRepo.findAll();
    console.log("\n" + "=".repeat(80));
    console.log("Final Statistics");
    console.log("=".repeat(80));
    console.log(`\n[SyncStatus Results]`);
    console.log(`Total SyncStatus records: ${updatedSyncStatuses.length}`);
    updatedSyncStatuses.forEach((status) => {
      console.log(`  - Pool: ${status.poolConfig}`);
      console.log(`    Last Sync Block: ${status.lastSyncBlock} (started from ${status.initializeBlock})`);
      console.log(`    Initialize Block: ${status.initializeBlock}`);
    });

    const allActivityRecords = await prisma.userActivity.findMany({
      orderBy: { timestamp: 'desc' }
    });
    const allActivities = allActivityRecords.map(record =>
      new UserActivity(
        record.userAddress,
        record.poolConfig,
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
      const statsByType: Record<string, number> = {};
      allActivities.forEach((activity) => {
        statsByType[activity.eventType] = (statsByType[activity.eventType] || 0) + 1;
      });
      console.log(`\nActivity by type:`);
      Object.entries(statsByType).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });

      const statsByPool: Record<string, number> = {};
      allActivities.forEach((activity) => {
        statsByPool[activity.poolConfig] = (statsByPool[activity.poolConfig] || 0) + 1;
      });
      console.log(`\nActivity by pool:`);
      Object.entries(statsByPool).forEach(([pool, count]) => {
        console.log(`  - ${pool}: ${count}`);
      });
    }
  } catch (error) {
    console.error("[Error] Failed to print statistics:", error);
  }
}



// Main test function
async function testFetchScheduler() {
  console.log("=".repeat(80));
  console.log("FetchScheduler Integration Test");
  console.log("=".repeat(80));

  try {
    console.log("\n[Step 1] Loading configuration...");
    const programAddress = getProgramAddress();
    console.log(`[Info] Program address: ${programAddress}`);
    console.log(`[Info] Chain ID: ${CHAIN_ID_VALUE}`);
    console.log(`[Info] RPC URL: ${RPC_URL}`);
    const syncStatusRepo = new SyncStatusRepository();
    console.log("\n[Step 3] Creating repositories...");
    const userActivityRepo = new UserActivityRepository();

    console.log("\n[Step 4] Creating FetchScheduler configuration...");
    const solanaConnections = new SolanaConnections(RPC_URL);
    const eventParserFactory = new UserTransactionEventsParserFactory();

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

    console.log("\n[Step 5] Creating FetchScheduler instance...");
    const scheduler = new FetchScheduler(
      syncStatusRepo,
      userActivityRepo,
      schedulerConfig
    );

    console.log("\n[Step 6] Starting FetchScheduler...");
    console.log("[Info] FetchScheduler will run continuously until stopped (Ctrl+C)");
    await scheduler.start();

    console.log("\n[Step 7] FetchScheduler is now running...");
    console.log("[Info] Press Ctrl+C to stop gracefully");
    console.log("=".repeat(80));

    // Set up signal handler for graceful shutdown
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

    // Keep the process alive until SIGINT or SIGTERM
    await new Promise<void>(() => {});

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

// Run test
testFetchScheduler()
  .then(() => {
    console.log("\n[Info] Script execution completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[Error] Script execution failed:", error);
    process.exit(1);
  });
