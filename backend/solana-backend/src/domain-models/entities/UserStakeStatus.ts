/**
 * UserStakeStatus (用户质押状态)
 * 用户在质押程序中的当前质押状态
 */
export class UserStakeStatus {
  public readonly userAddress: string; // Address
  public readonly amount: bigint; // TokenAmount (u64)
  public readonly stakeTimestamp: number; // Unix timestamp
  public readonly lastClaimTime: number; // Unix timestamp
  public readonly rewardDebt: bigint; // TokenAmount (u64)
  public readonly pendingRewards: bigint; // TokenAmount (u64) - 计算得出

  constructor(
    userAddress: string,
    amount: bigint,
    stakeTimestamp: number,
    lastClaimTime: number,
    rewardDebt: bigint,
    pendingRewards: bigint
  ) {
    if (stakeTimestamp < 0) {
      throw new Error("Stake timestamp must be non-negative");
    }
    if (lastClaimTime < 0) {
      throw new Error("Last claim time must be non-negative");
    }
    if (lastClaimTime < stakeTimestamp) {
      throw new Error("Last claim time cannot be before stake timestamp");
    }
    this.userAddress = userAddress;
    this.amount = amount;
    this.stakeTimestamp = stakeTimestamp;
    this.lastClaimTime = lastClaimTime;
    this.rewardDebt = rewardDebt;
    this.pendingRewards = pendingRewards;
  }

  /**
   * 从链上账户数据创建UserStakeStatus实体
   */
  static fromChainData(data: {
    owner: string;
    amount: number | bigint;
    stakeTimestamp: number;
    lastClaimTime: number;
    rewardDebt: number | bigint;
    pendingRewards?: number | bigint;
  }): UserStakeStatus {
    return new UserStakeStatus(
      data.owner,
      typeof data.amount === "bigint" ? data.amount : BigInt(data.amount),
      data.stakeTimestamp,
      data.lastClaimTime,
      typeof data.rewardDebt === "bigint" ? data.rewardDebt : BigInt(data.rewardDebt),
      typeof data.pendingRewards === "bigint" 
        ? data.pendingRewards 
        : BigInt(data.pendingRewards ?? 0)
    );
  }
}

