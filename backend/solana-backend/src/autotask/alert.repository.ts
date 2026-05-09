import { PrismaClient } from "../generated/prisma/client";
import { getPrismaClient } from "../infrastructure/PrismaClient";

export interface AlertRecord {
  id?: string;
  poolConfig: string;
  alertType: string;
  message: string;
  threshold: string;
  actualValue: string;
  createdAt: number;
  resolved: boolean;
}

export class AlertRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findOpenAlert(
    poolConfig: string,
    alertType: string
  ): Promise<AlertRecord | null> {
    return this.prisma.alert.findFirst({
      where: {
        poolConfig,
        alertType,
        resolved: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async save(alert: AlertRecord): Promise<void> {
    await this.prisma.alert.create({
      data: {
        poolConfig: alert.poolConfig,
        alertType: alert.alertType,
        message: alert.message,
        threshold: alert.threshold,
        actualValue: alert.actualValue,
        createdAt: alert.createdAt,
        resolved: alert.resolved,
      },
    });
  }

  async resolveOpenAlert(
    poolConfig: string,
    alertType: string
  ): Promise<void> {
    await this.prisma.alert.updateMany({
      where: {
        poolConfig,
        alertType,
        resolved: false,
      },
      data: {
        resolved: true,
      },
    });
  }
}
