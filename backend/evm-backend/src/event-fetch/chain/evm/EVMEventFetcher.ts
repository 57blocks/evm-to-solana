import { decodeEventLog, type Abi, type Address, type Hash, type PublicClient } from "viem";
import StakingAbi from "../../../../abi/Staking.json";
import { SyncStatus } from "../../../domain-models";
import {
  RemainingRewardsWithdrawnEvent,
  RewardsFundedEvent,
} from "../../admin/event";
import { BatchHandler, EventFetcher, FetchingResult } from "../chain";
import { BaseEvent } from "../event";
import {
  RewardClaimedEvent,
  StakedEvent,
  UnstakedEvent,
} from "../../user/event";

const EVENT_NAMES = [
  "Staked",
  "Unstaked",
  "RewardClaimed",
  "RewardsFunded",
  "RemainingRewardsWithdrawn",
] as const;

export const STAKING_EVENT_ABI = (StakingAbi.abi as Abi).filter((item) => {
  return item.type === "event" && EVENT_NAMES.includes(item.name as never);
}) as Abi;

export interface EVMEventFetcherConfig {
  blockChunkSize: number;
  confirmationBlocks: number;
}

interface DecodedEvent {
  eventName: string;
  args: Record<string, unknown>;
}

export class EVMEventFetcher implements EventFetcher {
  constructor(
    private readonly client: PublicClient,
    private readonly config: EVMEventFetcherConfig
  ) {}

  async fetchEvents(
    syncStatus: SyncStatus,
    onBatch?: BatchHandler
  ): Promise<FetchingResult> {
    const head = Number(await this.client.getBlockNumber());
    const safeHead = head - this.config.confirmationBlocks;
    let fromBlock = syncStatus.lastSyncedBlock + 1;

    if (fromBlock > safeHead) {
      return { events: [], endBlockNumber: syncStatus.lastSyncedBlock };
    }

    const allEvents: BaseEvent[] = [];
    let endBlockNumber = syncStatus.lastSyncedBlock;
    const timestampCache = new Map<number, number>();

    while (fromBlock <= safeHead) {
      const toBlock = Math.min(
        safeHead,
        fromBlock + this.config.blockChunkSize - 1
      );
      const logs = await this.client.getLogs({
        address: syncStatus.contractAddress as Address,
        events: STAKING_EVENT_ABI,
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
      } as never);

      const batchEvents: BaseEvent[] = [];
      for (const log of logs as Array<{
        address: Address;
        blockNumber: bigint | null;
        transactionHash: Hash | null;
        logIndex: number | null;
        data: Hash;
        topics: Hash[];
      }>) {
        if (
          log.blockNumber === null ||
          log.transactionHash === null ||
          log.logIndex === null
        ) {
          continue;
        }

        const blockNumber = Number(log.blockNumber);
        const timestamp = await this.getBlockTimestamp(blockNumber, timestampCache);
        const decoded = decodeEventLog({
          abi: STAKING_EVENT_ABI,
          data: log.data,
          topics: log.topics as [] | [Hash, ...Hash[]],
        }) as unknown as DecodedEvent;

        batchEvents.push(
          this.toBaseEvent(syncStatus, decoded, {
            blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.logIndex,
            timestamp,
          })
        );
      }

      const batchResult = { events: batchEvents, endBlockNumber: toBlock };
      allEvents.push(...batchEvents);
      endBlockNumber = toBlock;

      if (onBatch) {
        await onBatch(batchResult);
      }

      fromBlock = toBlock + 1;
    }

    return { events: allEvents, endBlockNumber };
  }

  private async getBlockTimestamp(
    blockNumber: number,
    cache: Map<number, number>
  ): Promise<number> {
    const cached = cache.get(blockNumber);
    if (cached !== undefined) {
      return cached;
    }

    const block = await this.client.getBlock({
      blockNumber: BigInt(blockNumber),
    });
    const timestamp = Number(block.timestamp);
    cache.set(blockNumber, timestamp);
    return timestamp;
  }

  private toBaseEvent(
    syncStatus: SyncStatus,
    decoded: DecodedEvent,
    metadata: {
      blockNumber: number;
      transactionHash: string;
      logIndex: number;
      timestamp: number;
    }
  ): BaseEvent {
    const common = {
      chainId: syncStatus.chainId,
      contractAddress: syncStatus.contractAddress,
      amount: this.getAmount(decoded),
      ...metadata,
    };

    switch (decoded.eventName) {
      case "Staked":
        return new StakedEvent({
          ...common,
          userAddress: String(decoded.args.user),
        });
      case "Unstaked":
        return new UnstakedEvent({
          ...common,
          userAddress: String(decoded.args.user),
        });
      case "RewardClaimed":
        return new RewardClaimedEvent({
          ...common,
          userAddress: String(decoded.args.user),
        });
      case "RewardsFunded":
        return new RewardsFundedEvent({
          ...common,
          userAddress: String(decoded.args.funder),
        });
      case "RemainingRewardsWithdrawn":
        return new RemainingRewardsWithdrawnEvent({
          ...common,
          userAddress: String(decoded.args.owner),
        });
      default:
        throw new Error(`Unsupported event: ${decoded.eventName}`);
    }
  }

  private getAmount(decoded: DecodedEvent): bigint {
    const amount = decoded.args.amount ?? decoded.args.reward;
    if (typeof amount !== "bigint") {
      throw new Error(`Invalid amount for event: ${decoded.eventName}`);
    }
    return amount;
  }
}
