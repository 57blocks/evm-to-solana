import { PrismaClient } from "../../generated/prisma/client";
import { SyncStatus } from "../../domain-models";
import { getPrismaClient } from "../../infrastructure/PrismaClient";
import { ISyncStatusRepository } from "../interfaces/ISyncStatusRepository";

export class SyncStatusRepository implements ISyncStatusRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findByPoolKey(poolKey: string): Promise<SyncStatus | null> {
    const record = await this.prisma.syncStatus.findUnique({
      where: { poolKey },
    });
    return record ? this.toDomainModel(record) : null;
  }

  async findAll(): Promise<SyncStatus[]> {
    const records = await this.prisma.syncStatus.findMany();
    return records.map((record) => this.toDomainModel(record));
  }

  async save(syncStatus: SyncStatus): Promise<void> {
    await this.prisma.syncStatus.upsert({
      where: { poolKey: syncStatus.poolKey },
      update: {
        chainId: syncStatus.chainId,
        contractAddress: syncStatus.contractAddress,
        rewardTokenAddress: syncStatus.rewardTokenAddress,
        name: syncStatus.name,
        lastSyncedBlock: syncStatus.lastSyncedBlock,
        initializeBlock: syncStatus.initializeBlock,
      },
      create: {
        poolKey: syncStatus.poolKey,
        chainId: syncStatus.chainId,
        contractAddress: syncStatus.contractAddress,
        rewardTokenAddress: syncStatus.rewardTokenAddress,
        name: syncStatus.name,
        lastSyncedBlock: syncStatus.lastSyncedBlock,
        initializeBlock: syncStatus.initializeBlock,
      },
    });
  }

  private toDomainModel(record: {
    poolKey: string;
    chainId: number;
    contractAddress: string;
    rewardTokenAddress: string;
    name: string;
    lastSyncedBlock: number;
    initializeBlock: number;
  }): SyncStatus {
    return new SyncStatus(record);
  }
}
