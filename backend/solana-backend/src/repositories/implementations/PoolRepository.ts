import { PublicKey } from "@solana/web3.js";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import { PoolConfig, PoolState } from "../../domain-models";
import { IPoolRepository } from "../interfaces/IPoolRepository";
import { SolanaConnections } from "../../infrastructure";
import { POOL_CONFIG_SEED, POOL_STATE_SEED } from "../constants";
import StakingIDL from "../../../idl/solana_staking.json";

interface DecodedPoolConfig {
  admin: PublicKey;
  pool_id: PublicKey;
  staking_mint: PublicKey;
  reward_mint: PublicKey;
  reward_per_second: bigint;
  bump: number;
}

interface DecodedPoolState {
  pool_config: PublicKey;
  acc_reward_per_share: bigint;
  last_reward_time: bigint;
  total_staked: bigint;
  total_reward_debt: bigint;
  bump: number;
}

export class PoolRepository implements IPoolRepository {
  private solanaConnections: SolanaConnections;
  private chainId: number;

  constructor(solanaConnections: SolanaConnections, chainId: number) {
    this.solanaConnections = solanaConnections;
    this.chainId = chainId;
  }

  async getPool(
    programId: string,
    poolId: string
  ): Promise<{ config: PoolConfig; state: PoolState }> {
    const programPubkey = new PublicKey(programId);
    const poolIdPubkey = new PublicKey(poolId);

    const [poolConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(POOL_CONFIG_SEED), poolIdPubkey.toBuffer()],
      programPubkey
    );
    const [poolStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(POOL_STATE_SEED), poolConfigPda.toBuffer()],
      programPubkey
    );

    const connection = this.solanaConnections.getConnection(this.chainId);
    const accountInfos = await connection.getMultipleAccountsInfo([
      poolConfigPda,
      poolStatePda,
    ]);

    const [configInfo, stateInfo] = accountInfos;
    if (!configInfo) {
      throw new Error(
        `PoolConfig account not found at PDA: ${poolConfigPda.toBase58()}`
      );
    }
    if (!stateInfo) {
      throw new Error(
        `PoolState account not found at PDA: ${poolStatePda.toBase58()}`
      );
    }

    const coder = new BorshCoder(StakingIDL as Idl);
    const decodedConfig = coder.accounts.decode(
      "PoolConfig",
      configInfo.data
    ) as DecodedPoolConfig;
    const decodedState = coder.accounts.decode(
      "PoolState",
      stateInfo.data
    ) as DecodedPoolState;

    const config = PoolConfig.fromChainData({
      poolConfigAddress: poolConfigPda.toBase58(),
      admin: decodedConfig.admin.toBase58(),
      poolId: decodedConfig.pool_id.toBase58(),
      stakingMint: decodedConfig.staking_mint.toBase58(),
      rewardMint: decodedConfig.reward_mint.toBase58(),
      rewardPerSecond: BigInt(decodedConfig.reward_per_second.toString()),
      bump: decodedConfig.bump,
    });

    const state = PoolState.fromChainData({
      poolStateAddress: poolStatePda.toBase58(),
      poolConfig: decodedState.pool_config.toBase58(),
      accRewardPerShare: BigInt(decodedState.acc_reward_per_share.toString()),
      lastRewardTime: Number(decodedState.last_reward_time),
      totalStaked: BigInt(decodedState.total_staked.toString()),
      totalRewardDebt: BigInt(decodedState.total_reward_debt.toString()),
      bump: decodedState.bump,
    });

    return { config, state };
  }
}
