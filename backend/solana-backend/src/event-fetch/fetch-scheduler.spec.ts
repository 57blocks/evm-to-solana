import { FetchScheduler, FetchSchedulerConfig } from "./FetchScheduler";
import { FetchingResult } from "./chain/chain";
import { BaseEvent } from "./chain/event";
import { UserStakedEvent, UserTransactionEventsParserFactory } from "./user/event";
import { SyncStatus } from "../domain-models";

const mockFetchEvents = jest.fn();

jest.mock("./chain/solana/solana", () => {
  const actual = jest.requireActual("./chain/solana/solana");
  return {
    ...actual,
    SolanaService: jest.fn(),
    SolanaEventFetcher: jest.fn().mockImplementation(() => ({
      fetchEvents: mockFetchEvents,
    })),
  };
});

describe("FetchScheduler.runOnce", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes the fetcher, saves fetched user activities, and advances sync status", async () => {
    const syncStatus = new SyncStatus("pool111111111111111111111111111111111111", 10, 10);
    const event = new UserStakedEvent(
      new BaseEvent(901, 11, "tx-1", 1_700_000_000, "success", syncStatus.poolConfig),
      syncStatus.poolConfig,
      "user111111111111111111111111111111111111",
      123n,
      1_700_000_000
    );

    mockFetchEvents.mockImplementation(async (_addresses, _startBlock, _parser, _endBlock, onBatchFetched) => {
      if (onBatchFetched) {
        await onBatchFetched(new FetchingResult([event], 18));
      }
      return new FetchingResult([], 18);
    });

    const syncStatusRepository = {
      findByPoolConfig: jest.fn(),
      findAll: jest.fn().mockResolvedValue([syncStatus]),
      save: jest.fn(),
    };
    const userActivityRepository = {
      save: jest.fn(),
      findByUser: jest.fn(),
      findByUserAndEventType: jest.fn(),
    };

    const config: FetchSchedulerConfig = {
      fetchingInterval: 0,
      retryDelayInterval: 1,
      maxRetries: 0,
      chainId: 901,
      eventParserFactory: new UserTransactionEventsParserFactory(),
      solanaConnections: { getConnection: jest.fn() } as never,
      solanaEventFetcherConfig: {
        slotToExclusion: 100,
        batchHours: 1,
        batchDays: 1,
        signaturesPerBatch: 1000,
        maxFetchedTransactionCount: 10000,
        sleepTime: 1,
        slotToCheck: 1000,
        promiseNumberForTransactions: 10,
      },
    };

    const scheduler = new FetchScheduler(
      syncStatusRepository,
      userActivityRepository,
      config
    );

    await scheduler.runOnce();

    expect(mockFetchEvents).toHaveBeenCalledWith(
      [syncStatus.poolConfig],
      10,
      expect.any(Object),
      undefined,
      expect.any(Function)
    );
    expect(userActivityRepository.save).toHaveBeenCalledTimes(1);
    expect(syncStatusRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        poolConfig: syncStatus.poolConfig,
        lastSyncBlock: 18,
      })
    );
  });
});
