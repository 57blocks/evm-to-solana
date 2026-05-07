/**
 * SyncStatus (同步状态)
 * 每个 pool 一个记录，跟踪事件同步进度
 */
export class SyncStatus {
  public readonly poolConfig: string; // PoolConfig PDA base58, 主键
  public readonly lastSyncBlock: number;
  public readonly initializeBlock: number;

  constructor(
    poolConfig: string,
    lastSyncBlock: number,
    initializeBlock: number
  ) {
    if (lastSyncBlock < initializeBlock) {
      throw new Error(
        "lastSyncBlock must be greater than or equal to initializeBlock"
      );
    }
    this.poolConfig = poolConfig;
    this.lastSyncBlock = lastSyncBlock;
    this.initializeBlock = initializeBlock;
  }

  static fromDatabase(data: {
    poolConfig: string;
    lastSyncBlock: number;
    initializeBlock: number;
  }): SyncStatus {
    return new SyncStatus(
      data.poolConfig,
      data.lastSyncBlock,
      data.initializeBlock
    );
  }

  updateLastSyncBlock(newLastSyncBlock: number): SyncStatus {
    return new SyncStatus(this.poolConfig, newLastSyncBlock, this.initializeBlock);
  }
}
