import { Inject, Injectable } from "@nestjs/common";
import type { Address } from "viem";
import RewardTokenAbi from "../../abi/RewardToken.json";
import { SyncStatus } from "../domain-models";
import { EVMClients } from "../infrastructure/EVMClients";

@Injectable()
export class RewardBalanceReader {
  constructor(
    @Inject(EVMClients)
    private readonly evmClients: EVMClients
  ) {}

  async getBalance(syncStatus: SyncStatus): Promise<bigint> {
    const client = this.evmClients.getClient(syncStatus.chainId);
    const balance = await client.readContract({
      address: syncStatus.rewardTokenAddress as Address,
      abi: RewardTokenAbi.abi,
      functionName: "balanceOf",
      args: [syncStatus.contractAddress as Address],
    } as never);
    return balance as bigint;
  }
}
