import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { ISyncStatusRepository } from "../repositories/interfaces/ISyncStatusRepository";
import {
  ALERT_REPOSITORY,
  SYNC_STATUS_REPOSITORY,
} from "../repositories/repositories.module";
import { AlertRepository } from "./alert.repository";
import { RewardVaultReader } from "./reward-vault-reader";

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
    @Inject(RewardVaultReader)
    private readonly rewardVaultReader: RewardVaultReader,
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository
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
        syncStatuses.map((syncStatus) =>
          this.checkPoolBalance(syncStatus.poolConfig)
        )
      );
    } catch (error) {
      this.logger.error("Pool balance monitor tick failed", error);
    } finally {
      this.isRunning = false;
    }
  }

  private async checkPoolBalance(poolConfig: string): Promise<void> {
    try {
      const threshold = this.config.getOrThrow<number>(
        "REWARD_BALANCE_THRESHOLD"
      );
      const balance = await this.rewardVaultReader.getRewardVaultBalance(poolConfig);

      if (balance.uiAmount >= threshold) {
        return;
      }

      this.logger.warn(
        `Reward vault ${balance.rewardVault} for pool ${poolConfig} is below threshold: ${balance.uiAmount} < ${threshold}`
      );

      const openAlert = await this.alertRepository.findOpenAlert(
        poolConfig,
        LOW_REWARD_BALANCE
      );
      if (openAlert) {
        return;
      }

      await this.alertRepository.save({
        poolConfig,
        alertType: LOW_REWARD_BALANCE,
        message: `Reward vault ${balance.rewardVault} balance is below threshold`,
        threshold: String(threshold),
        actualValue: String(balance.uiAmount),
        createdAt: Math.floor(Date.now() / 1000),
        resolved: false,
      });
    } catch (error) {
      this.logger.error(`Failed to check pool ${poolConfig} reward balance`, error);
    }
  }
}
