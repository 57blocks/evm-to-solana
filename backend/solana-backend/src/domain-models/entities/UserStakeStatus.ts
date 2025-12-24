/**
 * UserStakeStatus (用户质押状态)
 * 用户在质押程序中的当前质押状态
 */
export class UserStakeStatus {
  public readonly userAddress: string; // Address
  public readonly amount: bigint; // TokenAmount (u64)
  public readonly stakeTimestamp: bigint; // Unix timestamp
  public readonly lastClaimTime: bigint; // Unix timestamp
  public readonly rewardDebt: bigint; // TokenAmount (u64)

  constructor(
    userAddress: string,
    amount: bigint,
    stakeTimestamp: bigint,
    lastClaimTime: bigint,
    rewardDebt: bigint,
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
  }

  /**
   * 从链上账户数据创建UserStakeStatus实体
   */
  static fromChainData(data: {
    owner: string;
    amount: bigint;
    stakeTimestamp: bigint;
    lastClaimTime: bigint;
    rewardDebt: bigint;
  }): UserStakeStatus {
    return new UserStakeStatus(
      data.owner,
      data.amount,
      data.stakeTimestamp,
      data.lastClaimTime,
      data.rewardDebt
    );
  }
}

