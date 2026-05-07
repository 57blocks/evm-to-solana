import "dotenv/config";
import { SyncStatus } from "../../src/domain-models";
import { SyncStatusRepository } from "../../src/repositories/implementations/SyncStatusRepository";
import { getPrismaClient, disconnectPrisma } from "../../src/infrastructure/PrismaClient";

/**
 * 数据库初始化函数
 * 在 SyncStatus 表中插入监控的 pool_config 数据
 *
 * @param poolsToInit - pool 配置数组，每个包含 poolConfig 和 initializeBlock
 * @param reset - 是否重置数据库（清空 SyncStatus 和 UserActivity），默认 false
 * @param disconnectAfterInit - 是否在初始化后断开连接（默认 true）
 */
async function initDatabase(
  poolsToInit: Array<{ poolConfig: string; initializeBlock: number }>,
  reset: boolean = false,
  disconnectAfterInit: boolean = true
): Promise<void> {
  const repository = new SyncStatusRepository();
  const prisma = getPrismaClient();

  try {
    if (poolsToInit.length === 0) {
      console.log("No valid pool configurations found, skipping initialization");
      return;
    }

    console.log(`Initializing database with ${poolsToInit.length} pool(s)...\n`);

    const existingSyncStatuses = await repository.findAll();
    if (existingSyncStatuses.length > 0) {
      if (reset) {
        console.log("SyncStatus contains existing data. Resetting database (clearing SyncStatus and UserActivity)...");
        const deleteSyncResult = await prisma.syncStatus.deleteMany({});
        const deleteActivityResult = await prisma.userActivity.deleteMany({});
        console.log(`✓ Deleted ${deleteSyncResult.count} SyncStatus record(s)`);
        console.log(`✓ Deleted ${deleteActivityResult.count} UserActivity record(s)\n`);
      } else {
        console.log("SyncStatus contains existing data. Skipping initialization (use reset=true to clear and reinitialize).");
        console.log(`Found ${existingSyncStatuses.length} existing SyncStatus record(s):`);
        existingSyncStatuses.forEach((status) => {
          console.log(`  - PoolConfig: ${status.poolConfig}, LastSyncBlock: ${status.lastSyncBlock}, InitializeBlock: ${status.initializeBlock}`);
        });
        return;
      }
    } else {
      console.log("SyncStatus is empty. Initializing pool records directly...\n");
    }

    let createdCount = 0;
    for (const { poolConfig, initializeBlock } of poolsToInit) {
      try {
        const syncStatus = new SyncStatus(poolConfig, initializeBlock, initializeBlock);
        await repository.save(syncStatus);
        console.log(
          `✓ Created SyncStatus for pool: ${poolConfig}\n` +
          `  - initializeBlock: ${initializeBlock}\n` +
          `  - lastSyncBlock: ${initializeBlock}\n`
        );
        createdCount++;
      } catch (error) {
        console.error(`✗ Failed to initialize pool ${poolConfig}:`, error);
        throw error;
      }
    }

    console.log(
      `\nDatabase initialization completed!\n` +
      `  - Created: ${createdCount}\n` +
      `  - Total: ${poolsToInit.length}`
    );
  } catch (error) {
    console.error("\nError initializing database:", error);
    throw error;
  } finally {
    if (disconnectAfterInit) {
      await disconnectPrisma();
    }
  }
}

/**
 * 从环境变量读取配置并初始化数据库
 *
 * Format: POOL_CONFIGS="pool1:block1,pool2:block2"
 */
async function initDatabaseFromEnv(reset: boolean = false) {
  const poolConfigsEnv = process.env.POOL_CONFIGS;

  if (!poolConfigsEnv) {
    throw new Error(
      "POOL_CONFIGS environment variable is not set. " +
      "Format: 'pool1:block1,pool2:block2' " +
      "Example: 'PoolConfigPDA1:1000,PoolConfigPDA2:2000'"
    );
  }

  const pairs = poolConfigsEnv.split(",").map((pair) => pair.trim());
  const poolsToInit: Array<{ poolConfig: string; initializeBlock: number }> = [];

  for (const pair of pairs) {
    const parts = pair.split(":").map((s) => s.trim());

    if (parts.length !== 2) {
      throw new Error(
        `Invalid POOL_CONFIGS format. Expected "pool1:block1,pool2:block2", ` +
        `but found invalid pair: "${pair}". ` +
        `Full config: ${poolConfigsEnv}`
      );
    }

    const [poolConfig, initializeBlockStr] = parts;

    if (!poolConfig) {
      throw new Error(`Pool config is required but empty in pair: "${pair}"`);
    }

    if (!initializeBlockStr) {
      throw new Error(
        `Initialize block is required but empty for pool: ${poolConfig}`
      );
    }

    const initializeBlock = parseInt(initializeBlockStr, 10);

    if (isNaN(initializeBlock) || initializeBlock < 0) {
      throw new Error(
        `Invalid initializeBlock for pool ${poolConfig}: ${initializeBlockStr}. ` +
        `Must be a non-negative integer.`
      );
    }

    poolsToInit.push({ poolConfig, initializeBlock });
  }

  await initDatabase(poolsToInit, reset);
}

if (require.main === module) {
  initDatabaseFromEnv(process.env.RESET_DB === "true")
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}
