use crate::constants::*;
use crate::errors::StakingError;
use crate::state::{PoolConfig, PoolState, UserStakeInfo};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

fn calculate_reward_debt_delta(amount: u64, acc_reward_per_share: u128) -> Result<i128> {
    let delta = (amount as u128 * acc_reward_per_share) / ACC_REWARD_PRECISION;
    i128::try_from(delta).map_err(|_| error!(StakingError::ArithmeticOverflow))
}

fn calculate_accumulated_reward(amount: u64, acc_reward_per_share: u128) -> Result<i128> {
    let accumulated = (amount as u128 * acc_reward_per_share) / ACC_REWARD_PRECISION;
    i128::try_from(accumulated).map_err(|_| error!(StakingError::ArithmeticOverflow))
}

fn calculate_acc_reward_per_share(
    pool_config: &PoolConfig,
    pool_state: &PoolState,
    current_time: i64,
) -> Result<u128> {
    if current_time <= pool_state.last_reward_time {
        return Ok(pool_state.acc_reward_per_share);
    }

    let total_staked = pool_state.total_staked;
    if total_staked == 0 {
        return Ok(pool_state.acc_reward_per_share);
    }

    let time_elapsed = (current_time - pool_state.last_reward_time) as u64;
    let reward = time_elapsed as u128 * pool_config.reward_per_second as u128;
    let acc_increment = (reward * ACC_REWARD_PRECISION) / total_staked as u128;
    Ok(pool_state.acc_reward_per_share + acc_increment)
}

pub fn update_pool(
    pool_config: &Account<PoolConfig>,
    pool_state: &mut Account<PoolState>,
    clock: &Sysvar<Clock>,
) -> Result<()> {
    let current_time = clock.unix_timestamp;
    if current_time <= pool_state.last_reward_time {
        return Ok(());
    }

    if pool_state.total_staked > 0 {
        let new_acc = calculate_acc_reward_per_share(pool_config, pool_state, current_time)?;
        pool_state.acc_reward_per_share = new_acc;
    }

    pool_state.last_reward_time = current_time;
    Ok(())
}

pub fn pending_reward(
    pool_config: &PoolConfig,
    pool_state: &PoolState,
    user_stake: &UserStakeInfo,
    current_time: i64,
) -> Result<u64> {
    let acc_reward_per_share =
        calculate_acc_reward_per_share(pool_config, pool_state, current_time)?;
    let accumulated = calculate_accumulated_reward(user_stake.amount, acc_reward_per_share)?;
    let pending = accumulated - user_stake.reward_debt;
    if pending <= 0 {
        return Ok(0);
    }
    u64::try_from(pending).map_err(|_| error!(StakingError::ArithmeticOverflow))
}

pub fn claim_pending_rewards<'info>(
    pool_config: &Account<'info, PoolConfig>,
    pool_state: &mut Account<'info, PoolState>,
    user_stake: &mut Account<'info, UserStakeInfo>,
    reward_vault: &Account<'info, TokenAccount>,
    user_reward_account: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
    clock: &Sysvar<'info, Clock>,
) -> Result<u64> {
    update_pool(pool_config, pool_state, clock)?;

    let accumulated =
        calculate_accumulated_reward(user_stake.amount, pool_state.acc_reward_per_share)?;
    let pending = accumulated - user_stake.reward_debt;

    user_stake.reward_debt = accumulated;

    if pending > 0 {
        let rewards =
            u64::try_from(pending).map_err(|_| error!(StakingError::ArithmeticOverflow))?;

        let seeds = &[
            POOL_CONFIG_SEED.as_ref(),
            pool_config.pool_id.as_ref(),
            &[pool_config.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: reward_vault.to_account_info(),
            to: user_reward_account.to_account_info(),
            authority: pool_config.to_account_info(),
        };
        let cpi_program = token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, rewards)?;

        return Ok(rewards);
    }

    Ok(0)
}

pub fn reward_debt_delta(amount: u64, acc_reward_per_share: u128) -> Result<i128> {
    calculate_reward_debt_delta(amount, acc_reward_per_share)
}
