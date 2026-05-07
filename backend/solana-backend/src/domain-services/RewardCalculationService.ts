import { PoolConfig, PoolState } from "../domain-models";
import { ACC_REWARD_PRECISION } from "../repositories/constants";

/**
 * RewardCalculationService
 *
 * 镜像 contract/solana-staking/programs/solana-staking/src/utils.rs:
 *  - calculate_acc_reward_per_share: 把 PoolState.acc_reward_per_share 投影到当前时间
 *  - calculate_share_value: amount * acc / ACC_REWARD_PRECISION
 *  - pending = accumulated - reward_debt
 *
 * 所有数值用 bigint，模拟链上 u128 / i128 算术（不会溢出 JS Number）。
 */
export class RewardCalculationService {
  /**
   * 把 PoolState.accRewardPerShare 投影到 `now`
   * 等价于合约里的 `calculate_acc_reward_per_share`
   */
  projectedAccRewardPerShare(
    state: PoolState,
    config: PoolConfig,
    now: bigint
  ): bigint {
    const lastRewardTime = BigInt(state.lastRewardTime);
    if (now <= lastRewardTime) {
      return state.accRewardPerShare;
    }
    if (state.totalStaked === 0n) {
      return state.accRewardPerShare;
    }

    const timeElapsed = now - lastRewardTime;
    const reward = timeElapsed * config.rewardPerSecond;
    const accIncrement = (reward * ACC_REWARD_PRECISION) / state.totalStaked;
    return state.accRewardPerShare + accIncrement;
  }

  /**
   * 计算用户当前可领的奖励（链上 claim_pending_rewards 等价）
   *
   * pending = (amount * projected_acc) / ACC_REWARD_PRECISION - reward_debt
   * 对应合约：accumulated - user.reward_debt
   */
  pendingRewards(
    user: { amount: bigint; rewardDebt: bigint },
    state: PoolState,
    config: PoolConfig,
    now: bigint
  ): bigint {
    const acc = this.projectedAccRewardPerShare(state, config, now);
    const accumulated = (user.amount * acc) / ACC_REWARD_PRECISION;
    const pending = accumulated - user.rewardDebt;
    return pending > 0n ? pending : 0n;
  }
}
