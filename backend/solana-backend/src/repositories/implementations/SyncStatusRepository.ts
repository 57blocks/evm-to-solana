import { SyncStatus } from "../../domain-models";
import { ISyncStatusRepository } from "../interfaces/ISyncStatusRepository";
import { getPrismaClient } from "../../infrastructure/PrismaClient";
import { PrismaClient } from "../../generated/prisma/client";

/**
 * SyncStatusRepository 实现
 * 使用 Prisma 数据库存储同步状态
 */
export class SyncStatusRepository implements ISyncStatusRepository {
  private prisma: PrismaClient;
  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * 获取当前同步状态
   */
  async findByVault(vaultId: string): Promise<SyncStatus | null> {
    const record = await this.prisma.syncStatus.findUnique({
      where: { vaultId },
    });

    if (!record) {
      return null;
    }

    return this.toDomainModel(record);
  }

  /**
   * 保存同步状态
   */
  async save(syncStatus: SyncStatus): Promise<void> {
    await this.prisma.syncStatus.upsert({
      where: { vaultId: syncStatus.vaultId },
      update: {
        lastSyncBlock: syncStatus.lastSyncBlock,
      },
      create: {
        vaultId: syncStatus.vaultId,
        lastSyncBlock: syncStatus.lastSyncBlock,
        initializeBlock: syncStatus.initializeBlock,
      },
    });
  }

  /**
   * 将数据库记录转换为领域模型
   */
  private toDomainModel(record: {
    vaultId: string;
    lastSyncBlock: number;
    initializeBlock: number;
  }): SyncStatus {
    return SyncStatus.fromDatabase({
      vaultId: record.vaultId,
      lastSyncBlock: record.lastSyncBlock,
      initializeBlock: record.initializeBlock,
    });
  }
}

