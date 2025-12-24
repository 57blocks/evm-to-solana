import { SyncStatus } from "../../domain-models";
import { ISyncStatusRepository } from "../interfaces/ISyncStatusRepository";

/**
 * SyncStatusRepository 实现
 * 使用内存数据库（Map）存储同步状态
 */
export class SyncStatusRepository implements ISyncStatusRepository {
  // 内存数据库：使用 Map 存储，key 为 programId
  private syncStatuses: Map<string, SyncStatus> = new Map();

  /**
   * 获取当前同步状态
   */
  async findByVault(vaultId: string): Promise<SyncStatus | null> {
    return this.syncStatuses.get(vaultId) || null;
  }

  /**
   * 保存同步状态
   */
  async save(syncStatus: SyncStatus): Promise<void> {
    this.syncStatuses.set(syncStatus.vaultId, syncStatus);
  }

  /**
   * 更新同步进度
   */
  async updateLastSyncBlock(
    vaultId: string,
    lastSyncBlock: number
  ): Promise<void> {
    const existing = await this.findByVault(vaultId);
    if (!existing) {
      throw new Error(
        `SyncStatus not found for vaultId: ${vaultId}. Please save it first.`
      );
    }
    const updated = existing.updateLastSyncBlock(lastSyncBlock);
    await this.save(updated);
  }

  /**
   * 清空所有数据（用于测试或重置）
   */
  clear(): void {
    this.syncStatuses.clear();
  }

  /**
   * 获取所有同步状态（用于调试）
   */
  getAll(): SyncStatus[] {
    return Array.from(this.syncStatuses.values());
  }
}

