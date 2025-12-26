import "dotenv/config";
import { SyncStatus } from "../src/domain-models";
import { SyncStatusRepository } from "../src/repositories/implementations/SyncStatusRepository";
import { getPrismaClient, disconnectPrisma } from "../src/infrastructure/PrismaClient";

/**
 * 数据库初始化脚本（幂等）
 * 在 SyncStatus 表中插入监控的 vault_id 数据
 * 
 * 此脚本是幂等的：每次运行都会先清空所有现有数据，然后全量插入新数据
 * 
 * 环境变量配置：
 * VAULT_IDS: 多个 vault 配置，格式为 "vault1:block1,vault2:block2"
 *   例如: "vault1:1000,vault2:2000,vault3:3000"
 * 
 * 每个 vault 需要提供：
 * - vaultId: vault 的 ID（必填）
 * - initializeBlock: 初始化区块号（必填）
 * - lastSyncBlock: 自动初始化为 initializeBlock（满足 SyncStatus 验证要求）
 */
async function initDatabase() {
  const repository = new SyncStatusRepository();
  const prisma = getPrismaClient();

  try {
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

    if (vaultsToInit.length === 0) {
      console.log("No valid vault configurations found, skipping initialization");
      return;
    }

    console.log(`Initializing database with ${vaultsToInit.length} vault(s)...\n`);

    // 幂等性：先清空所有现有的 SyncStatus 数据
    console.log("Clearing existing SyncStatus data...");
    const deleteResult = await prisma.syncStatus.deleteMany({});
    console.log(`✓ Deleted ${deleteResult.count} existing record(s)\n`);

    // 全量插入新数据
    let successCount = 0;

    for (const { vaultId, initializeBlock } of vaultsToInit) {
      try {
        // 创建新的 SyncStatus（lastSyncBlock 初始化为 initializeBlock）
        const syncStatus = new SyncStatus(vaultId, initializeBlock, initializeBlock);

        // 保存到数据库
        await repository.save(syncStatus);

        console.log(
          `✓ Created SyncStatus for vault: ${vaultId}\n` +
          `  - initializeBlock: ${initializeBlock}\n` +
          `  - lastSyncBlock: ${initializeBlock}\n`
        );
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to initialize vault ${vaultId}:`, error);
        throw error;
      }
    }

    console.log(
      `\nDatabase initialization completed!\n` +
      `  - Deleted: ${deleteResult.count}\n` +
      `  - Created: ${successCount}\n` +
      `  - Total: ${vaultsToInit.length}`
    );
  } catch (error) {
    console.error("\nError initializing database:", error);
    throw error;
  } finally {
    await disconnectPrisma();
  }
}

// 运行脚本
initDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

