import { SyncStatus } from "../../domain-models";

/**
 * SyncStatusRepository 接口
 * 查询和维护同步状态
 */
export interface ISyncStatusRepository {
  findByPoolConfig(poolConfig: string): Promise<SyncStatus | null>;

  findAll(): Promise<SyncStatus[]>;

  save(syncStatus: SyncStatus): Promise<void>;
}
