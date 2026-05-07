/**
 * UserStakeStatus
 * Mirrors on-chain UserStakeInfo (amount, reward_debt, bump only),
 * plus backend-calculated pendingRewards.
 */
export class UserStakeStatus {
  public readonly userAddress: string;
  public readonly poolConfig: string; // owning pool
  public readonly amount: bigint; // u64
  public readonly rewardDebt: bigint; // i128
  public readonly pendingRewards: bigint; // backend-calculated
  public readonly bump: number;

  constructor(
    userAddress: string,
    poolConfig: string,
    amount: bigint,
    rewardDebt: bigint,
    pendingRewards: bigint,
    bump: number
  ) {
    this.userAddress = userAddress;
    this.poolConfig = poolConfig;
    this.amount = amount;
    this.rewardDebt = rewardDebt;
    this.pendingRewards = pendingRewards;
    this.bump = bump;
  }

  static fromChainData(data: {
    userAddress: string;
    poolConfig: string;
    amount: bigint;
    rewardDebt: bigint;
    pendingRewards: bigint;
    bump: number;
  }): UserStakeStatus {
    return new UserStakeStatus(
      data.userAddress,
      data.poolConfig,
      data.amount,
      data.rewardDebt,
      data.pendingRewards,
      data.bump
    );
  }
}
