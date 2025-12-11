/**
 * GlobalState (全局状态)
 * 质押程序的全局配置和统计信息
 */
export class GlobalState {
  public readonly admin: string; // Address
  public readonly stakingMint: string; // Address
  public readonly rewardMint: string; // Address
  public readonly stakingVault: string; // Address
  public readonly rewardVault: string; // Address
  public readonly rewardRate: number; // Basis points (100 = 1%)
  public readonly totalStaked: bigint; // TokenAmount (u64)

  constructor(
    admin: string,
    stakingMint: string,
    rewardMint: string,
    stakingVault: string,
    rewardVault: string,
    rewardRate: number,
    totalStaked: bigint
  ) {
    if (rewardRate < 0 || rewardRate > 10000) {
      throw new Error("Reward rate must be between 0 and 10000 basis points");
    }
    this.admin = admin;
    this.stakingMint = stakingMint;
    this.rewardMint = rewardMint;
    this.stakingVault = stakingVault;
    this.rewardVault = rewardVault;
    this.rewardRate = rewardRate;
    this.totalStaked = totalStaked;
  }

  /**
   * 从链上账户数据创建GlobalState实体
   */
  static fromChainData(data: {
    admin: string;
    stakingMint: string;
    rewardMint: string;
    stakingVault: string;
    rewardVault: string;
    rewardRate: number;
    totalStaked: bigint;
  }): GlobalState {
    return new GlobalState(
      data.admin,
      data.stakingMint,
      data.rewardMint,
      data.stakingVault,
      data.rewardVault,
      data.rewardRate,
      data.totalStaked
    );
  }
}

