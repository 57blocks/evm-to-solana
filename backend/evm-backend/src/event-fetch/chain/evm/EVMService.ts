import type { Abi, Address, PublicClient } from "viem";

export class EVMService {
  constructor(private readonly client: PublicClient) {}

  getBlockNumber(): Promise<bigint> {
    return this.client.getBlockNumber();
  }

  getLogs(params: {
    address: Address;
    events: Abi;
    fromBlock: bigint;
    toBlock: bigint;
  }) {
    return this.client.getLogs(params as never);
  }

  readContract(params: {
    address: Address;
    abi: Abi;
    functionName: string;
    args: unknown[];
  }): Promise<unknown> {
    return this.client.readContract(params as never);
  }

  getBlock(params: { blockNumber: bigint }) {
    return this.client.getBlock(params);
  }
}
