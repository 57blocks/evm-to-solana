import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import {
  FetchScheduler,
  FetchSchedulerConfig,
} from "../event-fetch/FetchScheduler";
import { CHAIN_ID } from "../event-fetch/chain/chain";
import { UserTransactionEventsParserFactory } from "../event-fetch/user/event";
import { SolanaEventFetcherConfig } from "../event-fetch/chain/solana/solana";
import { SolanaConnections } from "../infrastructure/SolanaConnections";
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
    @Inject(SolanaConnections)
    private readonly solanaConnections: SolanaConnections
  ) {}

  onModuleInit(): void {
    this.fetchScheduler = new FetchScheduler(
      this.syncStatusRepository,
      this.userActivityRepository,
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
    const solanaEventFetcherConfig: SolanaEventFetcherConfig = {
      slotToExclusion: 100,
      batchHours: 1,
      batchDays: 1,
      signaturesPerBatch: 1000,
      maxFetchedTransactionCount: 10000,
      sleepTime: 100,
      slotToCheck: 1000,
      promiseNumberForTransactions: 10,
    };
    const solscanEndpoint = this.config.get<string>("SOLSCAN_ENDPOINT") || "";
    const solscanApiKey = this.config.get<string>("SOLSCAN_API_KEY") || "";

    return {
      fetchingInterval: 0,
      retryDelayInterval: this.config.getOrThrow<number>(
        "INDEXING_RETRY_DELAY_MS"
      ),
      maxRetries: this.config.getOrThrow<number>("INDEXING_MAX_RETRIES"),
      chainId: this.config.get<string>("CHAIN_ID") ?? CHAIN_ID.SolanaDevnet,
      programId: this.config.getOrThrow<string>("PROGRAM_ID"),
      eventParserFactory: new UserTransactionEventsParserFactory(),
      solanaConnections: this.solanaConnections,
      solanaEventFetcherConfig,
      solscanConfig:
        solscanEndpoint && solscanApiKey
          ? {
              endpoint: solscanEndpoint,
              apiKey: solscanApiKey,
              maxRetries: 3,
              timeout: 30000,
              batchSize: 100,
            }
          : undefined,
    };
  }
}