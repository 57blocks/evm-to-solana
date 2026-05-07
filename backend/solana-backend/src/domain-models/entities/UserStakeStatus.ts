/**
 * UserStakeStatus (用户质押状态)
 * 镜像 on-chain UserStakeInfo（仅 amount, reward_debt, bump），
 * 加上后端计算的 pendingRewards
 */
export class UserStakeStatus {
  public readonly userAddress: string;
  public readonly poolConfig: string; // 所属池
  public readonly amount: bigint; // u64
  public readonly rewardDebt: bigint; // i128
  public readonly pendingRewards: bigint; // 后端计算
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
