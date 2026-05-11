import { SyncStatus } from "../../domain-models";

export interface ISyncStatusRepository {
  findByPoolKey(poolKey: string): Promise<SyncStatus | null>;
  findAll(): Promise<SyncStatus[]>;
  save(syncStatus: SyncStatus): Promise<void>;
}
