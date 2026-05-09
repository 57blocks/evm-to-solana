import { PrismaClient } from "../../generated/prisma/client";
import { getPrismaClient } from "../../infrastructure/PrismaClient";
import { AlertRecord, IAlertRepository } from "../interfaces/IAlertRepository";

export class AlertRepository implements IAlertRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findOpenAlert(
    poolKey: string,
    alertType: string
  ): Promise<AlertRecord | null> {
    return this.prisma.alert.findFirst({
      where: {
        poolKey,
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
        poolKey: alert.poolKey,
        alertType: alert.alertType,
        message: alert.message,
        threshold: alert.threshold,
        actualValue: alert.actualValue,
        createdAt: alert.createdAt,
        resolved: alert.resolved,
      },
    });
  }

  async resolveOpenAlert(poolKey: string, alertType: string): Promise<void> {
    await this.prisma.alert.updateMany({
      where: {
        poolKey,
        alertType,
        resolved: false,
      },
      data: {
        resolved: true,
      },
    });
  }
}
