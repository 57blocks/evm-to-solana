/**
 * SyncStatus (同步状态)
 * 事件同步服务维护的同步进度状态
 */
export class SyncStatus {
  public readonly programId: string; // Address
  public readonly lastSyncBlock: number; // Slot
  public readonly initializeBlock: number; // Slot

  constructor(
    programId: string,
    lastSyncBlock: number,
    initializeBlock: number
  ) {
    if (lastSyncBlock < initializeBlock) {
      throw new Error(
        "lastSyncBlock must be greater than or equal to initializeBlock"
      );
    }
    this.programId = programId;
    this.lastSyncBlock = lastSyncBlock;
    this.initializeBlock = initializeBlock;
  }

  /**
   * 从数据库数据创建SyncStatus实体
   */
  static fromDatabase(data: {
    programId: string;
    lastSyncBlock: number;
    initializeBlock: number;
  }): SyncStatus {
    return new SyncStatus(
      data.programId,
      data.lastSyncBlock,
      data.initializeBlock
    );
  }

  /**
   * 更新lastSyncBlock
   */
  updateLastSyncBlock(newLastSyncBlock: number): SyncStatus {
    return new SyncStatus(this.programId, newLastSyncBlock, this.initializeBlock);
  }
}

