import { PoolConfig, PoolState } from "../../domain-models";

/**
 * PoolRepository 接口
 * 从 Solana 链上查询 pool 的 config + state
 */
export interface IPoolRepository {
  /**
   * 取一个 pool 的不可变配置 + 累积状态
   * @param programId staking program id
   * @param poolId PoolConfig.pool_id (Pubkey base58)
   */
  getPool(
    programId: string,
    poolId: string
  ): Promise<{ config: PoolConfig; state: PoolState }>;
}
