import { UserActivity, EventType } from "../../domain-models";
import { IUserActivityRepository } from "../interfaces/IUserActivityRepository";
import { getPrismaClient } from "../../infrastructure/PrismaClient";
import { PrismaClient } from "../../generated/prisma/client";

export class UserActivityRepository implements IUserActivityRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient = getPrismaClient()) {
    this.prisma = prisma;
  }

  async save(activity: UserActivity): Promise<void> {
    await this.prisma.userActivity.upsert({
      where: {
        txHash_eventType: {
          txHash: activity.txHash,
          eventType: activity.eventType,
        },
      },
      update: {
        userAddress: activity.userAddress,
        poolConfig: activity.poolConfig,
        positionDelta: activity.positionDelta.toString(),
        rewards: activity.rewards.toString(),
        blockNumber: activity.blockNumber,
        timestamp: activity.timestamp,
      },
      create: {
        userAddress: activity.userAddress,
        poolConfig: activity.poolConfig,
        eventType: activity.eventType,
        positionDelta: activity.positionDelta.toString(),
        rewards: activity.rewards.toString(),
        blockNumber: activity.blockNumber,
        txHash: activity.txHash,
        timestamp: activity.timestamp,
      },
    });
  }

  async findByUser(
    userAddress: string,
    poolConfig: string
  ): Promise<UserActivity[]> {
    const records = await this.prisma.userActivity.findMany({
      where: {
        userAddress,
        poolConfig,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return records.map(this.toDomainModel);
  }

  async findByUserAndEventType(
    userAddress: string,
    poolConfig: string,
    eventType: string
  ): Promise<UserActivity[]> {
    const records = await this.prisma.userActivity.findMany({
      where: {
        userAddress,
        poolConfig,
        eventType,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return records.map(this.toDomainModel);
  }

  private toDomainModel(record: {
    userAddress: string;
    poolConfig: string;
    eventType: string;
    positionDelta: string;
    rewards: string;
    blockNumber: number;
    txHash: string;
    timestamp: number;
  }): UserActivity {
    return new UserActivity(
      record.userAddress,
      record.poolConfig,
      record.eventType as EventType,
      BigInt(record.positionDelta),
      BigInt(record.rewards),
      record.blockNumber,
      record.txHash,
      record.timestamp
    );
  }
}
