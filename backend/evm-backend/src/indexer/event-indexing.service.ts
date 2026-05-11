import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import {
  FetchScheduler,
  FetchSchedulerConfig,
} from "../event-fetch/FetchScheduler";
import { EVMClients } from "../infrastructure/EVMClients";
import { ISyncStatusRepository } from "../repositories/interfaces/ISyncStatusRepository";
import { IUserActivityRepository } from "../repositories/interfaces/IUserActivityRepository";
import {
  SYNC_STATUS_REPOSITORY,
  USER_ACTIVITY_REPOSITORY,
} from "../repositories/repositories.module";

@Injectable()
export class EventIndexingService implements OnModuleInit {
  private readonly logger = new Logger(EventIndexingService.name);
  private fetchScheduler: FetchScheduler | null = null;
  private isRunning = false;

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService,
    @Inject(SchedulerRegistry)
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(SYNC_STATUS_REPOSITORY)
    private readonly syncStatusRepository: ISyncStatusRepository,
    @Inject(USER_ACTIVITY_REPOSITORY)
    private readonly userActivityRepository: IUserActivityRepository,
    @Inject(EVMClients)
    private readonly evmClients: EVMClients
  ) {}

  onModuleInit(): void {
    this.fetchScheduler = new FetchScheduler(
      this.syncStatusRepository,
      this.userActivityRepository,
      this.evmClients,
      this.buildSchedulerConfig()
    );

    const job = new CronJob(this.config.getOrThrow<string>("INDEXING_CRON"), () => {
      void this.tick();
    });
    this.schedulerRegistry.addCronJob("event-indexing", job);
    job.start();
  }

  async tick(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    if (!this.fetchScheduler) {
      throw new Error("FetchScheduler has not been initialized");
    }

    this.isRunning = true;
    try {
      await this.fetchScheduler.runOnce();
    } catch (error) {
      this.logger.error("Event indexing tick failed", error);
    } finally {
      this.isRunning = false;
    }
  }

  private buildSchedulerConfig(): FetchSchedulerConfig {
    return {
      retryDelayInterval: this.config.getOrThrow<number>(
        "INDEXING_RETRY_DELAY_MS"
      ),
      maxRetries: this.config.getOrThrow<number>("INDEXING_MAX_RETRIES"),
      blockChunkSize: this.config.getOrThrow<number>("BLOCK_CHUNK_SIZE"),
      confirmationBlocks: this.config.getOrThrow<number>("CONFIRMATION_BLOCKS"),
    };
  }
}
