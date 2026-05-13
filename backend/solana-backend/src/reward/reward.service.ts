import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PublicKey } from "@solana/web3.js";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import { UserStakeStatus } from "../domain-models";
import { EventType } from "../domain-models";
import {
  SYNC_STATUS_REPOSITORY,
  USER_ACTIVITY_REPOSITORY,
  POOL_REPOSITORY,
  USER_STAKE_POSITION_REPOSITORY,
} from "../repositories/repositories.module";
import { ISyncStatusRepository } from "../repositories/interfaces/ISyncStatusRepository";
import { IUserActivityRepository } from "../repositories/interfaces/IUserActivityRepository";
import { IPoolRepository } from "../repositories/interfaces/IPoolRepository";
import { IUserStakePositionRepository } from "../repositories/interfaces/IUserStakePositionRepository";
import { SolanaConnections } from "../infrastructure/SolanaConnections";
import { CHAIN_ID } from "../event-fetch/chain/chain";
import StakingIDL from "../../idl/solana_staking.json";

interface DecodedPoolConfig {
  admin: PublicKey;
  pool_id: PublicKey;
  staking_mint: PublicKey;
  reward_mint: PublicKey;
  reward_per_second: bigint;
  bump: number;
}

export interface SolanaPoolRewardInfo {
  poolConfig: string;
  poolId: string;
  stakedAmount: string;
  pendingRewards: string;
  claimedRewards: string;
}

export interface ActivityRecord {
  eventType: string;
  amount: string;
  blockNumber: number;
  txHash: string;
  timestamp: number;
}

export interface SolanaUserRewardResponse {
  userAddress: string;
  pools: SolanaPoolRewardInfo[];
  totalStaked: string;
  totalPendingRewards: string;
  totalClaimedRewards: string;
  activities: ActivityRecord[];
}

@Injectable()
export class RewardService {
  private readonly logger = new Logger(RewardService.name);

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService,
    @Inject(SYNC_STATUS_REPOSITORY)
    private readonly syncStatusRepository: ISyncStatusRepository,
    @Inject(USER_ACTIVITY_REPOSITORY)
    private readonly userActivityRepository: IUserActivityRepository,
    @Inject(USER_STAKE_POSITION_REPOSITORY)
    private readonly userStakePositionRepository: IUserStakePositionRepository,
    @Inject(SolanaConnections)
    private readonly solanaConnections: SolanaConnections,
  ) {}

  async getUserRewards(userAddress: string): Promise<SolanaUserRewardResponse> {
    const programId = this.config.getOrThrow<string>("PROGRAM_ID");
    const chainId = this.config.get<string>("CHAIN_ID") ?? CHAIN_ID.SolanaDevnet;
    const syncStatuses = await this.syncStatusRepository.findAll();

    const poolInfos = await Promise.all(
      syncStatuses.map((syncStatus) =>
        this.getPoolRewardInfo(userAddress, programId, chainId, syncStatus.poolConfig),
      ),
    );

    const totalStaked = poolInfos.reduce(
      (sum, p) => sum + BigInt(p.stakedAmount),
      0n,
    );
    const totalPending = poolInfos.reduce(
      (sum, p) => sum + BigInt(p.pendingRewards),
      0n,
    );
    const totalClaimed = poolInfos.reduce(
      (sum, p) => sum + BigInt(p.claimedRewards),
      0n,
    );

    // Fetch reward claim activities across all pools
    const allActivities: ActivityRecord[] = [];
    for (const syncStatus of syncStatuses) {
      const poolActivities = await this.userActivityRepository.findByUserAndEventType(
        userAddress,
        syncStatus.poolConfig,
        EventType.RewardsClaimed,
      );
      allActivities.push(
        ...poolActivities.map((a) => ({
          eventType: a.eventType,
          amount: a.eventType === EventType.RewardsClaimed
            ? a.rewards.toString()
            : a.positionDelta.toString(),
          blockNumber: a.blockNumber,
          txHash: a.txHash,
          timestamp: a.timestamp,
        })),
      );
    }
    allActivities.sort((a, b) => b.timestamp - a.timestamp);

    return {
      userAddress,
      pools: poolInfos,
      totalStaked: totalStaked.toString(),
      totalPendingRewards: totalPending.toString(),
      totalClaimedRewards: totalClaimed.toString(),
      activities: allActivities,
    };
  }

  private async getPoolRewardInfo(
    userAddress: string,
    programId: string,
    chainId: string | number,
    poolConfigPda: string,
  ): Promise<SolanaPoolRewardInfo> {
    try {
      // Read PoolConfig to extract poolId
      const poolConfigPubkey = new PublicKey(poolConfigPda);
      const poolId = await this.getPoolIdFromConfig(poolConfigPubkey, chainId);

      // Get on-chain stake position with pending rewards
      const position = await this.userStakePositionRepository.getUserStakePosition(
        userAddress,
        programId,
        poolId,
      );
      // Get total claimed from DB events
      const claimedActivities = await this.userActivityRepository.findByUserAndEventType(
        userAddress,
        poolConfigPda,
        EventType.RewardsClaimed,
      );
      const totalClaimed = claimedActivities.reduce(
        (sum, a) => sum + a.rewards,
        0n,
      );

      return {
        poolConfig: poolConfigPda,
        poolId,
        stakedAmount: position?.amount.toString() ?? "0",
        pendingRewards: position?.pendingRewards.toString() ?? "0",
        claimedRewards: totalClaimed.toString(),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to get reward info for user=${userAddress} pool=${poolConfigPda}`,
        error,
      );
      return {
        poolConfig: poolConfigPda,
        poolId: poolConfigPda,
        stakedAmount: "0",
        pendingRewards: "0",
        claimedRewards: "0",
      };
    }
  }

  private async getPoolIdFromConfig(
    poolConfigPda: PublicKey,
    chainId: string | number,
  ): Promise<string> {
    const connection = this.solanaConnections.getConnection(chainId);
    const accountInfo = await connection.getAccountInfo(poolConfigPda);
    if (!accountInfo) {
      throw new Error(`PoolConfig account not found: ${poolConfigPda.toBase58()}`);
    }

    const coder = new BorshCoder(StakingIDL as Idl);
    const decoded = coder.accounts.decode(
      "PoolConfig",
      accountInfo.data,
    ) as DecodedPoolConfig;

    return decoded.pool_id.toBase58();
  }
}
