/**
 * SyncStatus (同步状态)
 * 事件同步服务维护的同步进度状态
 */
export class SyncStatus {
  public readonly vaultId: string; // Address
  public readonly lastSyncBlock: number; // Slot
  public readonly initializeBlock: number; // Slot

  constructor(
    vaultId: string,
    lastSyncBlock: number,
    initializeBlock: number
  ) {
    if (lastSyncBlock < initializeBlock) {
      throw new Error(
        "lastSyncBlock must be greater than or equal to initializeBlock"
      );
    }
    this.vaultId = vaultId;
    this.lastSyncBlock = lastSyncBlock;
    this.initializeBlock = initializeBlock;
  }

  /**
   * 从数据库数据创建SyncStatus实体
   */
  static fromDatabase(data: {
    vaultId: string;
    lastSyncBlock: number;
    initializeBlock: number;
  }): SyncStatus {
    return new SyncStatus(
      data.vaultId,
      data.lastSyncBlock,
      data.initializeBlock
    );
  }

  /**
   * 更新lastSyncBlock
   */
  updateLastSyncBlock(newLastSyncBlock: number): SyncStatus {
    return new SyncStatus(this.vaultId, newLastSyncBlock, this.initializeBlock);
  }
}

