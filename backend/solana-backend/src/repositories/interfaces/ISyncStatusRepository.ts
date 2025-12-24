import { SyncStatus } from "../../domain-models";

/**
 * SyncStatusRepository 接口
 * 查询和维护同步状态
 */
export interface ISyncStatusRepository {
  /**
   * 获取当前同步状态
   */
  findByVault(vaultId: string): Promise<SyncStatus | null>;

  /**
   * 保存同步状态
   */
  save(syncStatus: SyncStatus): Promise<void>;
}

