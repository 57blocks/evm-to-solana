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
  async findByProgram(programId: string): Promise<SyncStatus | null> {
    return this.syncStatuses.get(programId) || null;
  }

  /**
   * 保存同步状态
   */
  async save(syncStatus: SyncStatus): Promise<void> {
    this.syncStatuses.set(syncStatus.programId, syncStatus);
  }

  /**
   * 更新同步进度
   */
  async updateLastSyncBlock(
    programId: string,
    lastSyncBlock: number
  ): Promise<void> {
    const existing = await this.findByProgram(programId);
    if (!existing) {
      throw new Error(
        `SyncStatus not found for programId: ${programId}. Please save it first.`
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

