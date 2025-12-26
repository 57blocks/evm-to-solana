import { ISyncStatusRepository } from "../repositories/interfaces/ISyncStatusRepository";
import { IUserActivityRepository } from "../repositories/interfaces/IUserActivityRepository";
import { SyncStatus } from "../domain-models";
import { UserActivity } from "../domain-models";
import { SolanaEventFetcher, SolanaEventFetcherConfig } from "./chain/solana/solana";
import { SolanaService } from "./chain/solana/solana";
import { TransactionEventsParserFactory, BaseEvent } from "./chain/event";
import {
  PermissionlessStakedEvent,
  PermissionlessUnstakedEvent,
  PermissionlessRewardsClaimedEvent
} from "./permissionless/event";
import { SolanaConnections } from "../infrastructure/SolanaConnections";
import { SolscanTransferEventFetcher } from "./chain/solana/solscan";
import { EventFetcher } from "./chain/chain";

export interface FetchSchedulerConfig {
  fetchingInterval: number; // 默认: 10000ms = 10s
  retryDelayInterval: number; // 默认: 2000ms = 2s
  maxRetries: number; // 默认: 3
  chainId: number;
  eventParserFactory: TransactionEventsParserFactory;
  solanaConnections: SolanaConnections;
  solanaEventFetcherConfig: SolanaEventFetcherConfig
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
 * 负责拉起和管理 UserActivity 同步到数据库的任务
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

  /**
   * 启动 FetchScheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("[FetchScheduler] Already running");
      return;
    }

    console.log("[FetchScheduler] Starting...");
    this.isRunning = true;

    // 初始化 EventFetcher
    await this.initializeEventFetcher();

    // 立即执行一次同步
    await this.syncAllVaults();

    // 设置定时器
    this.timer = setInterval(async () => {
      try {
        await this.syncAllVaults();
      } catch (error) {
        console.error("[FetchScheduler] Error in scheduled sync:", error);
      }
    }, this.config.fetchingInterval);

    console.log(
      `[FetchScheduler] Started with interval ${this.config.fetchingInterval}ms`
    );
  }

  /**
   * 停止 FetchScheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log("[FetchScheduler] Stopping...");
    this.isRunning = false;

    // 取消定时器
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    console.log("[FetchScheduler] Stopped");
  }

  /**
   * 初始化 EventFetcher
   */
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
      0, // defaultStartBlock
      10000, // maxCount
      this.config.solanaEventFetcherConfig,
      transferEventFetcher
    );
  }

  /**
   * 同步所有 vault
   */
  private async syncAllVaults(): Promise<void> {
    try {
      console.log("[FetchScheduler] Starting sync for all vaults...");

      // 获取所有 vault 记录
      const allSyncStatuses = await this.syncStatusRepository.findAll();

      if (allSyncStatuses.length === 0) {
        console.log("[FetchScheduler] No vaults found in SyncStatus");
        return;
      }

      console.log(
        `[FetchScheduler] Found ${allSyncStatuses.length} vault(s) to sync`
      );

      // 为每个 vault 创建异步任务
      const syncPromises = allSyncStatuses.map((syncStatus) =>
        this.syncVault(syncStatus)
      );

      // 等待所有任务完成
      await Promise.allSettled(syncPromises);

      console.log("[FetchScheduler] Completed sync for all vaults");
    } catch (error) {
      console.error("[FetchScheduler] Error syncing all vaults:", error);
      throw error;
    }
  }

  /**
   * 同步单个 vault
   */
  private async syncVault(syncStatus: SyncStatus): Promise<void> {
    const vaultId = syncStatus.vaultId;
    let retries = 0;

    while (retries <= this.config.maxRetries) {
      try {
        console.log(
          `[FetchScheduler] Syncing vault ${vaultId}, lastSyncBlock: ${syncStatus.lastSyncBlock}`
        );

        // 确定起始区块
        const startBlock = syncStatus.lastSyncBlock + 1;
        const eventsParser = this.config.eventParserFactory.createTransactionEventsParser(
          this.config.chainId,
          [vaultId], // vaultId 就是 monitorAddress (tokenMints)
          [
            PermissionlessStakedEvent,
            PermissionlessUnstakedEvent,
            PermissionlessRewardsClaimedEvent,
          ]
        );
        // 调用 SolanaEventFetcher 同步
        if (!this.eventFetcher) {
          throw new Error("EventFetcher not initialized");
        }

        const result = await this.eventFetcher.fetchEvents(
          [vaultId],
          startBlock,
          eventsParser
        );

        console.log(
          `[FetchScheduler] Fetched ${result.events.length} events for vault ${vaultId}`
        );

        // 转换并保存事件
        if (result.events.length > 0) {
          const userActivities: UserActivity[] = [];
          
          // 转换事件，跳过无法转换的事件
          for (const event of result.events) {
            try {
              const activity = this.convertEventToUserActivity(event, vaultId);
              userActivities.push(activity);
            } catch (error) {
              // 记录日志但跳过该事件，不中断同步流程
              console.warn(
                `[FetchScheduler] Failed to convert event ${event.transactionHash}:`,
                error
              );
            }
          }

          // 保存所有成功转换的事件
          for (const activity of userActivities) {
            await this.userActivityRepository.save(activity);
          }

          console.log(
            `[FetchScheduler] Saved ${userActivities.length} activities for vault ${vaultId} (skipped ${result.events.length - userActivities.length} events)`
          );
        }

        // 更新 SyncStatus
        const updatedSyncStatus = syncStatus.updateLastSyncBlock(
          result.endBlockNumber
        );
        await this.syncStatusRepository.save(updatedSyncStatus);

        console.log(
          `[FetchScheduler] Updated sync status for vault ${vaultId}, new lastSyncBlock: ${result.endBlockNumber}`
        );

        // 成功，退出重试循环
        return;
      } catch (error) {
        retries++;
        console.error(
          `[FetchScheduler] Error syncing vault ${vaultId} (attempt ${retries}/${this.config.maxRetries}):`,
          error
        );

        if (retries > this.config.maxRetries) {
          console.error(
            `[FetchScheduler] Max retries reached for vault ${vaultId}, giving up`
          );
          throw error;
        }
        // 等待后重试
        await this.sleep(this.config.retryDelayInterval);
      }
    }
  }

  /**
   * 转换 BaseEvent 到 UserActivity
   */
  private convertEventToUserActivity(
    event: BaseEvent,
    vaultId: string
  ): UserActivity {
    if (event instanceof PermissionlessStakedEvent) {
      return UserActivity.createStakedActivity(
        event.userAddress,
        vaultId,
        event.amount,
        event.rewards,
        event.blockNumber,
        event.transactionHash,
        event.timestamp
      );
    } else if (event instanceof PermissionlessUnstakedEvent) {
      return UserActivity.createUnstakedActivity(
        event.userAddress,
        vaultId,
        event.amount,
        event.rewards,
        event.blockNumber,
        event.transactionHash,
        event.timestamp
      );
    } else if (event instanceof PermissionlessRewardsClaimedEvent) {
      return UserActivity.createRewardsClaimedActivity(
        event.userAddress,
        vaultId,
        event.amount,
        event.blockNumber,
        event.transactionHash,
        event.timestamp
      );
    } else {
      // 未知事件类型，记录日志但跳过
      console.warn(
        `[FetchScheduler] Unknown event type: ${event.constructor.name}, skipping`
      );
      throw new Error(`Unknown event type: ${event.constructor.name}`);
    }
  }

  /**
   * 睡眠工具函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

