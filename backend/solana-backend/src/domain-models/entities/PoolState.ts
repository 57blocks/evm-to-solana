/**
 * PoolState (池状态)
 * 单个 staking pool 的可变累积状态。MasterChef-style:
 * acc_reward_per_share 按 ACC_REWARD_PRECISION (1e12) 精度累积
 */
export class PoolState {
  public readonly poolStateAddress: string; // PoolState PDA, base58
  public readonly poolConfig: string; // 关联 PoolConfig PDA
  public readonly accRewardPerShare: bigint; // u128
  public readonly lastRewardTime: number; // i64 unix seconds
  public readonly totalStaked: bigint; // u64
  public readonly totalRewardDebt: bigint; // i128
  public readonly bump: number;

  constructor(
    poolStateAddress: string,
    poolConfig: string,
    accRewardPerShare: bigint,
    lastRewardTime: number,
    totalStaked: bigint,
    totalRewardDebt: bigint,
    bump: number
  ) {
    this.poolStateAddress = poolStateAddress;
    this.poolConfig = poolConfig;
    this.accRewardPerShare = accRewardPerShare;
    this.lastRewardTime = lastRewardTime;
    this.totalStaked = totalStaked;
    this.totalRewardDebt = totalRewardDebt;
    this.bump = bump;
  }

  static fromChainData(data: {
    poolStateAddress: string;
    poolConfig: string;
    accRewardPerShare: bigint;
    lastRewardTime: number;
    totalStaked: bigint;
    totalRewardDebt: bigint;
    bump: number;
  }): PoolState {
    return new PoolState(
      data.poolStateAddress,
      data.poolConfig,
      data.accRewardPerShare,
      data.lastRewardTime,
      data.totalStaked,
      data.totalRewardDebt,
      data.bump
    );
  }
}
