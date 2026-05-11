import { SyncStatus, UserActivity } from "../domain-models";
import { EVMClients } from "../infrastructure/EVMClients";
import { ISyncStatusRepository } from "../repositories/interfaces/ISyncStatusRepository";
import { IUserActivityRepository } from "../repositories/interfaces/IUserActivityRepository";
import { EVMEventFetcher } from "./chain/evm/EVMEventFetcher";
import { BaseEvent } from "./chain/event";

export interface FetchSchedulerConfig {
  retryDelayInterval: number;
  maxRetries: number;
  blockChunkSize: number;
  confirmationBlocks: number;
}

export class FetchScheduler {
  constructor(
    private readonly syncStatusRepository: ISyncStatusRepository,
    private readonly userActivityRepository: IUserActivityRepository,
    private readonly evmClients: EVMClients,
    private readonly config: FetchSchedulerConfig
  ) {}

  async runOnce(): Promise<void> {
    await this.syncAllPools();
  }

  private async syncAllPools(): Promise<void> {
    console.log("[FetchScheduler] Starting sync for all pools...");
    const syncStatuses = await this.syncStatusRepository.findAll();
    if (syncStatuses.length === 0) {
      console.log("[FetchScheduler] No pools found in SyncStatus");
      return;
    }

    const results = await Promise.allSettled(
      syncStatuses.map((syncStatus) => this.syncPool(syncStatus))
    );
    const rejected = results.find((result) => result.status === "rejected");
    if (rejected && rejected.status === "rejected") {
      throw rejected.reason;
    }
  }

  private async syncPool(syncStatus: SyncStatus): Promise<void> {
    let retries = 0;
    while (retries <= this.config.maxRetries) {
      try {
        console.log(
          `[FetchScheduler] Starting sync for ${syncStatus.poolKey}, lastSyncedBlock: ${syncStatus.lastSyncedBlock}`
        );
        const client = this.evmClients.getClient(syncStatus.chainId);
        const fetcher = new EVMEventFetcher(client, {
          blockChunkSize: this.config.blockChunkSize,
          confirmationBlocks: this.config.confirmationBlocks,
        });
        let persistedBatchCount = 0;
        const result = await fetcher.fetchEvents(syncStatus, async (batch) => {
          persistedBatchCount++;
          await this.persistFetchingResult(syncStatus, batch);
        });

        if (persistedBatchCount === 0) {
          await this.persistFetchingResult(syncStatus, result);
        }
        return;
      } catch (error) {
        retries++;
        console.error(
          `[FetchScheduler] Error syncing pool ${syncStatus.poolKey} (attempt ${retries}/${this.config.maxRetries}):`,
          error
        );
        if (retries > this.config.maxRetries) {
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
    for (const event of result.events) {
      await this.userActivityRepository.save(
        UserActivity.create({
          chainId: event.chainId,
          contractAddress: event.contractAddress,
          userAddress: event.userAddress,
          eventType: event.eventType,
          amount: event.amount,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          logIndex: event.logIndex,
          timestamp: event.timestamp,
        })
      );
    }

    await this.syncStatusRepository.save(
      syncStatus.updateLastSyncedBlock(result.endBlockNumber)
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
