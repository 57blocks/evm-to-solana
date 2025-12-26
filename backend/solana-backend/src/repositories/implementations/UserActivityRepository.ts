import { UserActivity, EventType } from "../../domain-models";
import { IUserActivityRepository } from "../interfaces/IUserActivityRepository";
import { getPrismaClient } from "../../infrastructure/PrismaClient";
import { PrismaClient } from "../../generated/prisma/client";

/**
 * UserActivityRepository 实现
 * 使用 Prisma 数据库存储用户活动记录
 */
export class UserActivityRepository implements IUserActivityRepository {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * 保存用户活动记录
   */
  async save(activity: UserActivity): Promise<void> {
    await this.prisma.userActivity.upsert({
      where: { txHash: activity.txHash },
      update: {
        userAddress: activity.userAddress,
        vaultId: activity.vaultId,
        eventType: activity.eventType,
        positionDelta: activity.positionDelta.toString(),
        rewards: activity.rewards.toString(),
        blockNumber: activity.blockNumber,
        timestamp: activity.timestamp,
      },
      create: {
        userAddress: activity.userAddress,
        vaultId: activity.vaultId,
        eventType: activity.eventType,
        positionDelta: activity.positionDelta.toString(),
        rewards: activity.rewards.toString(),
        blockNumber: activity.blockNumber,
        txHash: activity.txHash,
        timestamp: activity.timestamp,
      },
    });
  }

  /**
   * 查询指定用户的所有活动
   */
  async findByUser(
    userAddress: string,
    vaultId: string
  ): Promise<UserActivity[]> {
    const records = await this.prisma.userActivity.findMany({
      where: {
        userAddress,
        vaultId,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return records.map(this.toDomainModel);
  }

  /**
   * 按事件类型过滤查询
   */
  async findByUserAndEventType(
    userAddress: string,
    vaultId: string,
    eventType: string
  ): Promise<UserActivity[]> {
    const records = await this.prisma.userActivity.findMany({
      where: {
        userAddress,
        vaultId,
        eventType,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return records.map(this.toDomainModel);
  }

  /**
   * 将数据库记录转换为领域模型
   */
  private toDomainModel(record: {
    userAddress: string;
    vaultId: string;
    eventType: string;
    positionDelta: string;
    rewards: string;
    blockNumber: number;
    txHash: string;
    timestamp: number;
  }): UserActivity {
    return new UserActivity(
      record.userAddress,
      record.vaultId,
      record.eventType as EventType,
      BigInt(record.positionDelta),
      BigInt(record.rewards),
      record.blockNumber,
      record.txHash,
      record.timestamp
    );
  }
}

