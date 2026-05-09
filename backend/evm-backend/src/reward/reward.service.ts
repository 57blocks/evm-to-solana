import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Address } from "viem";
import { EVMClients } from "../infrastructure/EVMClients";
import { PoolConfig } from "../domain-models";
import {
  USER_ACTIVITY_REPOSITORY,
} from "../repositories/repositories.module";
import { IUserActivityRepository } from "../repositories/interfaces/IUserActivityRepository";

const STAKING_ABI = [
  {
    name: "getStakeInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    outputs: [
      { internalType: "uint256", name: "stakedAmount", type: "uint256" },
      { internalType: "uint256", name: "pending", type: "uint256" },
      { internalType: "uint256", name: "claimedReward", type: "uint256" },
    ],
  },
] as const;

export interface PoolRewardInfo {
  poolKey: string;
  poolName: string;
  chainId: number;
  contractAddress: string;
  rewardTokenAddress: string;
  stakedAmount: string;
  pendingRewards: string;
  claimedRewards: string;
}

export interface UserRewardResponse {
  userAddress: string;
  pools: PoolRewardInfo[];
  totalStaked: string;
  totalPendingRewards: string;
  totalClaimedRewards: string;
}

@Injectable()
export class RewardService {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService,
    @Inject(EVMClients)
    private readonly evmClients: EVMClients,
    @Inject(USER_ACTIVITY_REPOSITORY)
    private readonly userActivityRepository: IUserActivityRepository,
  ) {}

  async getUserRewards(userAddress: string): Promise<UserRewardResponse> {
    const pools = this.parsePoolConfigs();

    const poolInfos = await Promise.all(
      pools.map((pool) => this.getPoolRewardInfo(userAddress, pool))
    );

    const totalStaked = poolInfos.reduce(
      (sum, p) => sum + BigInt(p.stakedAmount),
      0n
    );
    const totalPending = poolInfos.reduce(
      (sum, p) => sum + BigInt(p.pendingRewards),
      0n
    );
    const totalClaimed = poolInfos.reduce(
      (sum, p) => sum + BigInt(p.claimedRewards),
      0n
    );

    return {
      userAddress: userAddress.toLowerCase(),
      pools: poolInfos,
      totalStaked: totalStaked.toString(),
      totalPendingRewards: totalPending.toString(),
      totalClaimedRewards: totalClaimed.toString(),
    };
  }

  private async getPoolRewardInfo(
    userAddress: string,
    pool: PoolConfig,
  ): Promise<PoolRewardInfo> {
    try {
      const client = this.evmClients.getClient(pool.chainId);
      const [stakedAmount, pending, claimedReward] = (await client.readContract({
        address: pool.stakingAddress as Address,
        abi: STAKING_ABI,
        functionName: "getStakeInfo",
        args: [userAddress as Address],
      } as never)) as [bigint, bigint, bigint];

      return {
        poolKey: pool.poolKey,
        poolName: pool.name,
        chainId: pool.chainId,
        contractAddress: pool.stakingAddress,
        rewardTokenAddress: pool.rewardTokenAddress,
        stakedAmount: stakedAmount.toString(),
        pendingRewards: pending.toString(),
        claimedRewards: claimedReward.toString(),
      };
    } catch (error) {
      return {
        poolKey: pool.poolKey,
        poolName: pool.name,
        chainId: pool.chainId,
        contractAddress: pool.stakingAddress,
        rewardTokenAddress: pool.rewardTokenAddress,
        stakedAmount: "0",
        pendingRewards: "0",
        claimedRewards: "0",
      };
    }
  }

  private parsePoolConfigs(): PoolConfig[] {
    const raw = this.config.getOrThrow<string>("POOL_CONFIGS");
    const parsed = JSON.parse(raw) as Array<{
      chainId: number;
      stakingAddress: string;
      rewardTokenAddress: string;
      startBlock: number;
      name: string;
    }>;
    return parsed.map((config) => new PoolConfig(config));
  }
}
