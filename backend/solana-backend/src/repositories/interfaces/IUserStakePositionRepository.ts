import { UserStakeStatus } from "../../domain-models";

/**
 * UserStakePositionRepository 接口
 * 链上查询用户在指定 pool 的质押状态（含 pendingRewards）
 */
export interface IUserStakePositionRepository {
  /**
   * @param userAddress 用户钱包地址
   * @param programId staking program id
   * @param poolId PoolConfig.pool_id
   */
  getUserStakePosition(
    userAddress: string,
    programId: string,
    poolId: string
  ): Promise<UserStakeStatus | null>;
}
