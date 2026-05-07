import { PoolConfig, PoolState } from "../domain-models";
import { ACC_REWARD_PRECISION } from "../repositories/constants";

/**
 * RewardCalculationService
 *
 * Mirrors contract/solana-staking/programs/solana-staking/src/utils.rs:
 *  - calculate_acc_reward_per_share: projects PoolState.acc_reward_per_share to the current time
 *  - calculate_share_value: amount * acc / ACC_REWARD_PRECISION
 *  - pending = accumulated - reward_debt
 *
 * All values use bigint to simulate on-chain u128/i128 arithmetic (no JS Number overflow).
 */
export class RewardCalculationService {
  /**
   * Projects PoolState.accRewardPerShare to `now`.
   * Equivalent to `calculate_acc_reward_per_share` in the contract.
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
   * Calculates user's currently claimable rewards (equivalent to on-chain claim_pending_rewards).
   *
   * pending = (amount * projected_acc) / ACC_REWARD_PRECISION - reward_debt
   * Contract equivalent: accumulated - user.reward_debt
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
