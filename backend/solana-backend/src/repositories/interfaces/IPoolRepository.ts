import { PoolConfig, PoolState } from "../../domain-models";

/**
 * IPoolRepository
 * Queries pool config + state from the Solana chain.
 */
export interface IPoolRepository {
  /**
   * Returns the immutable config and accumulated state for a pool.
   * @param programId staking program id
   * @param poolId PoolConfig.pool_id (Pubkey base58)
   */
  getPool(
    programId: string,
    poolId: string
  ): Promise<{ config: PoolConfig; state: PoolState }>;
}
