import { SyncStatus } from "../../domain-models";

/**
 * ISyncStatusRepository
 * Queries and maintains sync state.
 */
export interface ISyncStatusRepository {
  findByPoolConfig(poolConfig: string): Promise<SyncStatus | null>;

  findAll(): Promise<SyncStatus[]>;

  save(syncStatus: SyncStatus): Promise<void>;
}
