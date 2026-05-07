import { SyncStatus } from "../../domain-models";
import { ISyncStatusRepository } from "../interfaces/ISyncStatusRepository";
import { getPrismaClient } from "../../infrastructure/PrismaClient";
import { PrismaClient } from "../../generated/prisma/client";

export class SyncStatusRepository implements ISyncStatusRepository {
  private prisma: PrismaClient;
  constructor() {
    this.prisma = getPrismaClient();
  }

  async findByPoolConfig(poolConfig: string): Promise<SyncStatus | null> {
    const record = await this.prisma.syncStatus.findUnique({
      where: { poolConfig },
    });

    if (!record) {
      return null;
    }

    return this.toDomainModel(record);
  }

  async findAll(): Promise<SyncStatus[]> {
    const records = await this.prisma.syncStatus.findMany();
    return records.map((record) => this.toDomainModel(record));
  }

  async save(syncStatus: SyncStatus): Promise<void> {
    await this.prisma.syncStatus.upsert({
      where: { poolConfig: syncStatus.poolConfig },
      update: {
        lastSyncBlock: syncStatus.lastSyncBlock,
      },
      create: {
        poolConfig: syncStatus.poolConfig,
        lastSyncBlock: syncStatus.lastSyncBlock,
        initializeBlock: syncStatus.initializeBlock,
      },
    });
  }

  private toDomainModel(record: {
    poolConfig: string;
    lastSyncBlock: number;
    initializeBlock: number;
  }): SyncStatus {
    return SyncStatus.fromDatabase({
      poolConfig: record.poolConfig,
      lastSyncBlock: record.lastSyncBlock,
      initializeBlock: record.initializeBlock,
    });
  }
}
