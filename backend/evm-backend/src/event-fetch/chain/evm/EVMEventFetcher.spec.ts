import { encodeEventTopics, encodeAbiParameters } from "viem";
import { SyncStatus } from "../../../domain-models";
import { EVMEventFetcher } from "./EVMEventFetcher";

const contractAddress = "0x67bebacfb97f13e1b33510309b74a0503695d0f3";
const userAddress = "0x0000000000000000000000000000000000000001";

function syncStatus(lastSyncedBlock: number): SyncStatus {
  return new SyncStatus({
    poolKey: `11155111:${contractAddress}`,
    chainId: 11155111,
    contractAddress,
    rewardTokenAddress: "0x0000000000000000000000000000000000000002",
    name: "sepolia-staking",
    lastSyncedBlock,
    initializeBlock: lastSyncedBlock,
  });
}

function stakedLog(blockNumber: number, logIndex: number) {
  return {
    address: contractAddress,
    blockNumber: BigInt(blockNumber),
    transactionHash: `0x${String(logIndex + 1).padStart(64, "0")}`,
    logIndex,
    data: encodeAbiParameters([{ type: "uint256" }], [100n]),
    topics: encodeEventTopics({
      abi: [
        {
          type: "event",
          name: "Staked",
          inputs: [
            { indexed: true, name: "user", type: "address" },
            { indexed: false, name: "amount", type: "uint256" },
          ],
        },
      ],
      eventName: "Staked",
      args: { user: userAddress },
    }),
  };
}

describe("EVMEventFetcher", () => {
  it("uses safe head and block chunk boundaries", async () => {
    const client = {
      getBlockNumber: jest.fn().mockResolvedValue(110n),
      getLogs: jest.fn().mockResolvedValue([]),
      getBlock: jest.fn(),
    };
    const fetcher = new EVMEventFetcher(client as never, {
      blockChunkSize: 3,
      confirmationBlocks: 5,
    });

    const result = await fetcher.fetchEvents(syncStatus(99));

    expect(result.endBlockNumber).toBe(105);
    expect(client.getLogs).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ fromBlock: 100n, toBlock: 102n })
    );
    expect(client.getLogs).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ fromBlock: 103n, toBlock: 105n })
    );
  });

  it("decodes staking logs and invokes onBatch per block chunk", async () => {
    const client = {
      getBlockNumber: jest.fn().mockResolvedValue(106n),
      getLogs: jest.fn().mockResolvedValue([stakedLog(100, 0)]),
      getBlock: jest.fn().mockResolvedValue({ timestamp: 12345n }),
    };
    const fetcher = new EVMEventFetcher(client as never, {
      blockChunkSize: 1,
      confirmationBlocks: 5,
    });
    const onBatch = jest.fn();

    const result = await fetcher.fetchEvents(syncStatus(99), onBatch);

    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      eventType: "Staked",
      userAddress,
      amount: 100n,
      blockNumber: 100,
      logIndex: 0,
      timestamp: 12345,
    });
    expect(onBatch).toHaveBeenCalledTimes(2);
  });
});
