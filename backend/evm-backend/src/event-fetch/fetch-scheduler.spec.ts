import { FetchScheduler } from "./FetchScheduler";
import { SyncStatus } from "../domain-models";

jest.mock("./chain/evm/EVMEventFetcher", () => {
  return {
    EVMEventFetcher: jest.fn().mockImplementation(() => ({
      fetchEvents: jest.fn(async (_syncStatus, onBatch) => {
        await onBatch({
          endBlockNumber: 12,
          events: [
            {
              chainId: 11155111,
              contractAddress: "0x67bebacfb97f13e1b33510309b74a0503695d0f3",
              userAddress: "0x0000000000000000000000000000000000000001",
              eventType: "Staked",
              amount: 5n,
              blockNumber: 12,
              transactionHash:
                "0x0000000000000000000000000000000000000000000000000000000000000012",
              logIndex: 0,
              timestamp: 1000,
            },
          ],
        });
        return { endBlockNumber: 12, events: [] };
      }),
    })),
  };
});

describe("FetchScheduler", () => {
  it("persists fetched events and advances lastSyncedBlock", async () => {
    const syncStatus = new SyncStatus({
      poolKey: "11155111:0x67bebacfb97f13e1b33510309b74a0503695d0f3",
      chainId: 11155111,
      contractAddress: "0x67bebacfb97f13e1b33510309b74a0503695d0f3",
      rewardTokenAddress: "0x0000000000000000000000000000000000000002",
      name: "sepolia-staking",
      lastSyncedBlock: 10,
      initializeBlock: 10,
    });
    const syncStatusRepository = {
      findAll: jest.fn().mockResolvedValue([syncStatus]),
      save: jest.fn(),
      findByPoolKey: jest.fn(),
    };
    const userActivityRepository = {
      save: jest.fn(),
      findByUser: jest.fn(),
      findByUserAndEventType: jest.fn(),
    };
    const scheduler = new FetchScheduler(
      syncStatusRepository,
      userActivityRepository,
      { getClient: jest.fn() } as never,
      {
        retryDelayInterval: 0,
        maxRetries: 0,
        blockChunkSize: 100,
        confirmationBlocks: 5,
      }
    );

    await scheduler.runOnce();

    expect(userActivityRepository.save).toHaveBeenCalledTimes(1);
    expect(syncStatusRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ lastSyncedBlock: 12 })
    );
  });
});
