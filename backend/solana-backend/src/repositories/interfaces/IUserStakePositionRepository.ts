import { UserStakeStatus } from "../../domain-models";

/**
 * IUserStakePositionRepository
 * Queries user stake position in a given pool from the chain (includes pendingRewards).
 */
export interface IUserStakePositionRepository {
  /**
   * @param userAddress user wallet address
   * @param programId staking program id
   * @param poolId PoolConfig.pool_id
   */
  getUserStakePosition(
    userAddress: string,
    programId: string,
    poolId: string
  ): Promise<UserStakeStatus | null>;
}
