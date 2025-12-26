import "dotenv/config";
import { SyncStatus } from "../../src/domain-models";
import { SyncStatusRepository } from "../../src/repositories/implementations/SyncStatusRepository";
import { getPrismaClient, disconnectPrisma } from "../../src/infrastructure/PrismaClient";

/**
 * 数据库初始化函数（可复用）
 * 在 SyncStatus 表中插入监控的 vault_id 数据
 * 
 * @param vaultsToInit - vault 配置数组，每个包含 vaultId 和 initializeBlock
 * @param reset - 是否重置数据库（清空 SyncStatus 和 UserActivity），默认 false（保留原有数据）
 * @param disconnectAfterInit - 是否在初始化后断开连接（默认 true）
 */
async function initDatabase(
  vaultsToInit: Array<{ vaultId: string; initializeBlock: number }>,
  reset: boolean = false,
  disconnectAfterInit: boolean = true
): Promise<void> {
  const repository = new SyncStatusRepository();
  const prisma = getPrismaClient();

  try {
    if (vaultsToInit.length === 0) {
      console.log("No valid vault configurations found, skipping initialization");
      return;
    }

    console.log(`Initializing database with ${vaultsToInit.length} vault(s)...\n`);

    // 检查 SyncStatus 中是否已有数据
    const existingSyncStatuses = await repository.findAll();
    if (existingSyncStatuses.length > 0) {
      // 如果 SyncStatus 中已经有数据，根据 reset 参数决定是否清空
      if (reset) {
        console.log("SyncStatus contains existing data. Resetting database (clearing SyncStatus and UserActivity)...");
        const deleteSyncResult = await prisma.syncStatus.deleteMany({});
        const deleteActivityResult = await prisma.userActivity.deleteMany({});
        console.log(`✓ Deleted ${deleteSyncResult.count} SyncStatus record(s)`);
        console.log(`✓ Deleted ${deleteActivityResult.count} UserActivity record(s)\n`);
      } else {
        // 如果已有数据且 reset=false，直接退出初始化
        console.log("SyncStatus contains existing data. Skipping initialization (use reset=true to clear and reinitialize).");
        console.log(`Found ${existingSyncStatuses.length} existing SyncStatus record(s):`);
        existingSyncStatuses.forEach((status) => {
          console.log(`  - Vault: ${status.vaultId}, LastSyncBlock: ${status.lastSyncBlock}, InitializeBlock: ${status.initializeBlock}`);
        });
        return;
      }
    } else {
      // 如果 SyncStatus 中没有数据，直接初始化（不需要清空操作）
      console.log("SyncStatus is empty. Initializing vault records directly...\n");
    }

    // 插入vault 配置
    // 执行到这里时，可以确定 SyncStatus 中肯定没有数据，直接初始化即可
    let createdCount = 0;
    for (const { vaultId, initializeBlock } of vaultsToInit) {
      try {
        const syncStatus = new SyncStatus(vaultId, initializeBlock, initializeBlock);
        await repository.save(syncStatus);
        console.log(
          `✓ Created SyncStatus for vault: ${vaultId}\n` +
          `  - initializeBlock: ${initializeBlock}\n` +
          `  - lastSyncBlock: ${initializeBlock}\n`
        );
        createdCount++;
      } catch (error) {
        console.error(`✗ Failed to initialize vault ${vaultId}:`, error);
        throw error;
      }
    }

    console.log(
      `\nDatabase initialization completed!\n` +
      `  - Created: ${createdCount}\n` +
      `  - Total: ${vaultsToInit.length}`
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
 * 用于命令行脚本执行
 * 
 * @param reset - 是否重置数据库（清空 SyncStatus 和 UserActivity），默认 false（保留原有数据）
 *               也可以通过环境变量 RESET_DB=true 来设置
 */
async function initDatabaseFromEnv(reset: boolean = false) {
  const vaultIdsConfig = process.env.VAULT_IDS;

  if (!vaultIdsConfig) {
    throw new Error(
      "VAULT_IDS environment variable is not set. " +
      "Format: 'vault1:block1,vault2:block2' " +
      "Example: 'vault1:1000,vault2:2000'"
    );
  }
  // 解析多个 vault 配置
  const pairs = vaultIdsConfig.split(",").map((pair) => pair.trim());
  const vaultsToInit: Array<{ vaultId: string; initializeBlock: number }> = [];

  for (const pair of pairs) {
    const parts = pair.split(":").map((s) => s.trim());
    
    if (parts.length !== 2) {
      throw new Error(
        `Invalid VAULT_IDS format. Expected "vault1:block1,vault2:block2", ` +
        `but found invalid pair: "${pair}". ` +
        `Full config: ${vaultIdsConfig}`
      );
    }

    const [vaultId, initializeBlockStr] = parts;

    if (!vaultId) {
      throw new Error(`Vault ID is required but empty in pair: "${pair}"`);
    }

    if (!initializeBlockStr) {
      throw new Error(
        `Initialize block is required but empty for vault: ${vaultId}`
      );
    }

    const initializeBlock = parseInt(initializeBlockStr, 10);
    
    if (isNaN(initializeBlock) || initializeBlock < 0) {
      throw new Error(
        `Invalid initializeBlock for vault ${vaultId}: ${initializeBlockStr}. ` +
        `Must be a non-negative integer.`
      );
    }

    vaultsToInit.push({ vaultId, initializeBlock });
  }

  await initDatabase(vaultsToInit, reset);
}

// 运行脚本（从环境变量读取配置）
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

