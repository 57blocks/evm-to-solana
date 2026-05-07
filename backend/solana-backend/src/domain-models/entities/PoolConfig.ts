/**
 * PoolConfig (池配置)
 * 单个 staking pool 的不可变配置
 */
export class PoolConfig {
  public readonly poolConfigAddress: string; // PoolConfig PDA, base58
  public readonly admin: string;
  public readonly poolId: string; // pool 唯一标识 (Pubkey)
  public readonly stakingMint: string;
  public readonly rewardMint: string;
  public readonly rewardPerSecond: bigint; // u64
  public readonly bump: number;

  constructor(
    poolConfigAddress: string,
    admin: string,
    poolId: string,
    stakingMint: string,
    rewardMint: string,
    rewardPerSecond: bigint,
    bump: number
  ) {
    this.poolConfigAddress = poolConfigAddress;
    this.admin = admin;
    this.poolId = poolId;
    this.stakingMint = stakingMint;
    this.rewardMint = rewardMint;
    this.rewardPerSecond = rewardPerSecond;
    this.bump = bump;
  }

  static fromChainData(data: {
    poolConfigAddress: string;
    admin: string;
    poolId: string;
    stakingMint: string;
    rewardMint: string;
    rewardPerSecond: bigint;
    bump: number;
  }): PoolConfig {
    return new PoolConfig(
      data.poolConfigAddress,
      data.admin,
      data.poolId,
      data.stakingMint,
      data.rewardMint,
      data.rewardPerSecond,
      data.bump
    );
  }
}
