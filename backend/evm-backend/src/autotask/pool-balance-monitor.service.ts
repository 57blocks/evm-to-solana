import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { SyncStatus } from "../domain-models";
import { IAlertRepository } from "../repositories/interfaces/IAlertRepository";
import { ISyncStatusRepository } from "../repositories/interfaces/ISyncStatusRepository";
import {
  ALERT_REPOSITORY,
  SYNC_STATUS_REPOSITORY,
} from "../repositories/repositories.module";
import { RewardBalanceReader } from "./reward-balance-reader";

export const LOW_REWARD_BALANCE = "LOW_REWARD_BALANCE";

@Injectable()
export class PoolBalanceMonitorService implements OnModuleInit {
  private readonly logger = new Logger(PoolBalanceMonitorService.name);
  private isRunning = false;

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService,
    @Inject(SchedulerRegistry)
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(SYNC_STATUS_REPOSITORY)
    private readonly syncStatusRepository: ISyncStatusRepository,
    @Inject(RewardBalanceReader)
    private readonly rewardBalanceReader: RewardBalanceReader,
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: IAlertRepository
  ) {}

  onModuleInit(): void {
    const job = new CronJob(
      this.config.getOrThrow<string>("POOL_BALANCE_MONITOR_CRON"),
      () => {
        void this.tick();
      }
    );
    this.schedulerRegistry.addCronJob("pool-balance-monitor", job);
    job.start();
  }

  async tick(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      const syncStatuses = await this.syncStatusRepository.findAll();
      await Promise.all(
        syncStatuses.map((syncStatus) => this.checkPoolBalance(syncStatus))
      );
    } catch (error) {
      this.logger.error("Pool balance monitor tick failed", error);
    } finally {
      this.isRunning = false;
    }
  }

  private async checkPoolBalance(syncStatus: SyncStatus): Promise<void> {
    try {
      const threshold = BigInt(
        this.config.getOrThrow<string>("BALANCE_THRESHOLD")
      );
      const balance = await this.rewardBalanceReader.getBalance(syncStatus);
      const openAlert = await this.alertRepository.findOpenAlert(
        syncStatus.poolKey,
        LOW_REWARD_BALANCE
      );

      if (balance >= threshold) {
        if (openAlert) {
          await this.alertRepository.resolveOpenAlert(
            syncStatus.poolKey,
            LOW_REWARD_BALANCE
          );
        }
        return;
      }

      if (openAlert) {
        return;
      }

      await this.alertRepository.save({
        poolKey: syncStatus.poolKey,
        alertType: LOW_REWARD_BALANCE,
        message: "RewardToken balance below threshold",
        threshold: threshold.toString(),
        actualValue: balance.toString(),
        createdAt: Math.floor(Date.now() / 1000),
        resolved: false,
      });
    } catch (error) {
      this.logger.error(
        `Failed to check pool ${syncStatus.poolKey} reward balance`,
        error
      );
    }
  }
}
