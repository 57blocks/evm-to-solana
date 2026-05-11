import { PrismaClient } from "../../generated/prisma/client";
import { EventType, UserActivity } from "../../domain-models";
import { getPrismaClient } from "../../infrastructure/PrismaClient";
import { IUserActivityRepository } from "../interfaces/IUserActivityRepository";

export class UserActivityRepository implements IUserActivityRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async save(activity: UserActivity): Promise<void> {
    await this.prisma.userActivity.upsert({
      where: {
        txHash_logIndex: {
          txHash: activity.txHash,
          logIndex: activity.logIndex,
        },
      },
      update: {
        chainId: activity.chainId,
        contractAddress: activity.contractAddress,
        userAddress: activity.userAddress,
        eventType: activity.eventType,
        amount: activity.amount.toString(),
        blockNumber: activity.blockNumber,
        timestamp: activity.timestamp,
      },
      create: {
        chainId: activity.chainId,
        contractAddress: activity.contractAddress,
        userAddress: activity.userAddress,
        eventType: activity.eventType,
        amount: activity.amount.toString(),
        blockNumber: activity.blockNumber,
        txHash: activity.txHash,
        logIndex: activity.logIndex,
        timestamp: activity.timestamp,
      },
    });
  }

  async findByUser(
    userAddress: string,
    contractAddress: string
  ): Promise<UserActivity[]> {
    const records = await this.prisma.userActivity.findMany({
      where: {
        userAddress: userAddress.toLowerCase(),
        contractAddress: contractAddress.toLowerCase(),
      },
      orderBy: { timestamp: "desc" },
    });
    return records.map(this.toDomainModel);
  }

  async findByUserAndEventType(
    userAddress: string,
    contractAddress: string,
    eventType: string
  ): Promise<UserActivity[]> {
    const records = await this.prisma.userActivity.findMany({
      where: {
        userAddress: userAddress.toLowerCase(),
        contractAddress: contractAddress.toLowerCase(),
        eventType,
      },
      orderBy: { timestamp: "desc" },
    });
    return records.map(this.toDomainModel);
  }

  private toDomainModel(record: {
    chainId: number;
    contractAddress: string;
    userAddress: string;
    eventType: string;
    amount: string;
    blockNumber: number;
    txHash: string;
    logIndex: number;
    timestamp: number;
  }): UserActivity {
    return new UserActivity({
      chainId: record.chainId,
      contractAddress: record.contractAddress,
      userAddress: record.userAddress,
      eventType: record.eventType as EventType,
      amount: BigInt(record.amount),
      blockNumber: record.blockNumber,
      txHash: record.txHash,
      logIndex: record.logIndex,
      timestamp: record.timestamp,
    });
  }
}
