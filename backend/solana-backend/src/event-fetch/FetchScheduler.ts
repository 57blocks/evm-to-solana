import { ISyncStatusRepository } from "../repositories/interfaces/ISyncStatusRepository";
import { IUserActivityRepository } from "../repositories/interfaces/IUserActivityRepository";
import { SyncStatus } from "../domain-models";
import { UserActivity } from "../domain-models";
import { SolanaEventFetcher, SolanaEventFetcherConfig } from "./chain/solana/solana";
import { SolanaService } from "./chain/solana/solana";
import { TransactionEventsParserFactory, BaseEvent } from "./chain/event";
import {
  UserStakedEvent,
  UserUnstakedEvent,
  UserRewardsClaimedEvent,
} from "./user/event";
import { SolanaConnections } from "../infrastructure/SolanaConnections";
import { SolscanTransferEventFetcher } from "./chain/solana/solscan";
import { EventFetcher } from "./chain/chain";

export interface FetchSchedulerConfig {
  fetchingInterval: number;
  retryDelayInterval: number;
  maxRetries: number;
  chainId: number;
  eventParserFactory: TransactionEventsParserFactory;
  solanaConnections: SolanaConnections;
  solanaEventFetcherConfig: SolanaEventFetcherConfig;
  solscanConfig?: {
    endpoint: string;
    apiKey: string;
    maxRetries: number;
    timeout: number;
    batchSize: number;
  };
}

/**
 * FetchScheduler
 * Starts and manages UserActivity sync tasks.
 *
 * Sync granularity: one SyncStatus record per pool (vaultId → poolConfig).
 * Monitor address: the PoolConfig PDA (base58) is passed directly to getSignaturesForAddress —
 * this PDA appears as an account in every stake / unstake / claim_rewards / fund_rewards / close_pool tx,
 * so it covers all user events.
 */
export class FetchScheduler {
  private syncStatusRepository: ISyncStatusRepository;
  private userActivityRepository: IUserActivityRepository;
  private config: FetchSchedulerConfig;
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private eventFetcher: EventFetcher | null = null;

  constructor(
    syncStatusRepository: ISyncStatusRepository,
    userActivityRepository: IUserActivityRepository,
    config: FetchSchedulerConfig
  ) {
    this.syncStatusRepository = syncStatusRepository;
    this.userActivityRepository = userActivityRepository;
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    await this.initializeEventFetcher();

    await this.syncAllPools();

    this.timer = setInterval(async () => {
      try {
        await this.syncAllPools();
      } catch (error) {
        console.error("[FetchScheduler] Error in scheduled sync:", error);
      }
    }, this.config.fetchingInterval);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<void> {
    if (!this.eventFetcher) {
      await this.initializeEventFetcher();
    }
    await this.syncAllPools();
  }

  private async initializeEventFetcher(): Promise<void> {
    const solanaService = new SolanaService(this.config.solanaConnections);
    let transferEventFetcher: SolscanTransferEventFetcher | undefined;
    if (this.config.solscanConfig) {
      transferEventFetcher = new SolscanTransferEventFetcher(
        this.config.chainId,
        solanaService,
        this.config.solscanConfig.apiKey,
        {
          endpoint: this.config.solscanConfig.endpoint,
          maxRetries: this.config.solscanConfig.maxRetries,
          timeout: this.config.solscanConfig.timeout,
          batchSize: this.config.solscanConfig.batchSize,
        }
      );
    }

    this.eventFetcher = new SolanaEventFetcher(
      this.config.chainId,
      solanaService,
      0,
      10000,
      this.config.solanaEventFetcherConfig,
      transferEventFetcher
    );
  }

  private async syncAllPools(): Promise<void> {
    try {
      console.log("[FetchScheduler] Starting sync for all pools...");

      const allSyncStatuses = await this.syncStatusRepository.findAll();

      if (allSyncStatuses.length === 0) {
        console.log("[FetchScheduler] No pools found in SyncStatus");
        return;
      }

      const syncPromises = allSyncStatuses.map((syncStatus) =>
        this.syncPool(syncStatus)
      );

      await Promise.allSettled(syncPromises);
    } catch (error) {
      console.error("[FetchScheduler] Error syncing all pools:", error);
      throw error;
    }
  }

  private async syncPool(syncStatus: SyncStatus): Promise<void> {
    const poolConfig = syncStatus.poolConfig;
    let retries = 0;

    while (retries <= this.config.maxRetries) {
      try {
        console.log(
          `[FetchScheduler] Starting sync for ${poolConfig}, lastSyncBlock: ${syncStatus.lastSyncBlock}`
        );

        const startBlock = syncStatus.lastSyncBlock;
        const eventsParser = this.config.eventParserFactory.createTransactionEventsParser(
          this.config.chainId,
          [poolConfig],
          [
            UserStakedEvent,
            UserUnstakedEvent,
            UserRewardsClaimedEvent,
          ]
        );
        if (!this.eventFetcher) {
          throw new Error("EventFetcher not initialized");
        }

        let persistedBatchCount = 0;
        const result = await this.eventFetcher.fetchEvents(
          [poolConfig],
          startBlock,
          eventsParser,
          undefined,
          async (batchResult) => {
            persistedBatchCount++;
            await this.persistFetchingResult(syncStatus, batchResult);
          }
        );

        if (persistedBatchCount === 0) {
          await this.persistFetchingResult(syncStatus, result);
        }

        return;
      } catch (error) {
        retries++;
        console.error(
          `[FetchScheduler] Error syncing pool ${poolConfig} (attempt ${retries}/${this.config.maxRetries}):`,
          error
        );

        if (retries > this.config.maxRetries) {
          console.error(
            `[FetchScheduler] Max retries reached for pool ${poolConfig}, giving up`
          );
          throw error;
        }
        await this.sleep(this.config.retryDelayInterval);
      }
    }
  }

  private async persistFetchingResult(
    syncStatus: SyncStatus,
    result: { events: BaseEvent[]; endBlockNumber: number }
  ): Promise<void> {
    const poolConfig = syncStatus.poolConfig;
    const userActivities: UserActivity[] = [];

    for (const event of result.events) {
      try {
        const activity = this.convertEventToUserActivity(event, poolConfig);
        userActivities.push(activity);
      } catch (error) {
        console.warn(
          `[FetchScheduler] Failed to convert event ${event.transactionHash}:`,
          error
        );
      }
    }

    for (const activity of userActivities) {
      await this.userActivityRepository.save(activity);
    }

    const updatedSyncStatus = syncStatus.updateLastSyncBlock(
      result.endBlockNumber
    );
    await this.syncStatusRepository.save(updatedSyncStatus);
  }

  private convertEventToUserActivity(
    event: BaseEvent,
    poolConfig: string
  ): UserActivity {
    if (event instanceof UserStakedEvent) {
      return UserActivity.createStakedActivity(
        event.userAddress,
        poolConfig,
        event.amount,
        event.blockNumber,
        event.transactionHash,
        event.timestamp
      );
    } else if (event instanceof UserUnstakedEvent) {
      return UserActivity.createUnstakedActivity(
        event.userAddress,
        poolConfig,
        event.amount,
        event.blockNumber,
        event.transactionHash,
        event.timestamp
      );
    } else if (event instanceof UserRewardsClaimedEvent) {
      return UserActivity.createRewardsClaimedActivity(
        event.userAddress,
        poolConfig,
        event.amount,
        event.blockNumber,
        event.transactionHash,
        event.timestamp
      );
    } else {
      console.warn(
        `[FetchScheduler] Unknown event type: ${event.constructor.name}, skipping`
      );
      throw new Error(`Unknown event type: ${event.constructor.name}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
