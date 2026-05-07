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
 * 拉起 + 管理 UserActivity 同步任务。
 *
 * 同步粒度：每个 pool 对应一条 SyncStatus（vaultId → poolConfig）。
 * 监听地址：直接用 PoolConfig PDA（base58）作为 getSignaturesForAddress 的入参——
 * 该 PDA 在每条 stake / unstake / claim_rewards / fund_rewards / close_pool tx 里
 * 都作为 account 出现，足以覆盖所有用户事件。
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
      console.log("[FetchScheduler] Already running");
      return;
    }

    console.log("[FetchScheduler] Starting...");
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

    console.log(
      `[FetchScheduler] Started with interval ${this.config.fetchingInterval}ms`
    );
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log("[FetchScheduler] Stopping...");
    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    console.log("[FetchScheduler] Stopped");
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

      console.log(
        `[FetchScheduler] Found ${allSyncStatuses.length} pool(s) to sync`
      );

      const syncPromises = allSyncStatuses.map((syncStatus) =>
        this.syncPool(syncStatus)
      );

      await Promise.allSettled(syncPromises);

      console.log("[FetchScheduler] Completed sync for all pools");
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
          `[FetchScheduler] Syncing pool ${poolConfig}, lastSyncBlock: ${syncStatus.lastSyncBlock}`
        );

        const startBlock = syncStatus.lastSyncBlock + 1;
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

        const result = await this.eventFetcher.fetchEvents(
          [poolConfig],
          startBlock,
          eventsParser
        );

        console.log(
          `[FetchScheduler] Fetched ${result.events.length} events for pool ${poolConfig}`
        );

        if (result.events.length > 0) {
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

          console.log(
            `[FetchScheduler] Saved ${userActivities.length} activities for pool ${poolConfig} (skipped ${result.events.length - userActivities.length} events)`
          );
        }

        const updatedSyncStatus = syncStatus.updateLastSyncBlock(
          result.endBlockNumber
        );
        await this.syncStatusRepository.save(updatedSyncStatus);

        console.log(
          `[FetchScheduler] Updated sync status for pool ${poolConfig}, new lastSyncBlock: ${result.endBlockNumber}`
        );

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
