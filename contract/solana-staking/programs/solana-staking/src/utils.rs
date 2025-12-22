use crate::constants::*;
use crate::errors::StakingError;
use crate::state::{GlobalState, UserStakeInfo};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

fn calculate_reward_debt_delta(amount: u64, acc_reward_per_share: u128) -> Result<i128> {
    let delta = (amount as u128)
        .checked_mul(acc_reward_per_share)
        .ok_or(StakingError::ArithmeticOverflow)?
        .checked_div(ACC_REWARD_PRECISION)
        .ok_or(StakingError::ArithmeticOverflow)?;
    i128::try_from(delta).map_err(|_| error!(StakingError::ArithmeticOverflow))
}

fn calculate_accumulated_reward(amount: u64, acc_reward_per_share: u128) -> Result<i128> {
    let accumulated = (amount as u128)
        .checked_mul(acc_reward_per_share)
        .ok_or(StakingError::ArithmeticOverflow)?
        .checked_div(ACC_REWARD_PRECISION)
        .ok_or(StakingError::ArithmeticOverflow)?;
    i128::try_from(accumulated).map_err(|_| error!(StakingError::ArithmeticOverflow))
}

fn calculate_acc_reward_per_share(
    state: &GlobalState,
    current_time: i64,
) -> Result<u128> {
    if current_time <= state.last_reward_time {
        return Ok(state.acc_reward_per_share);
    }

    let total_staked = state.total_staked;
    if total_staked == 0 {
        return Ok(state.acc_reward_per_share);
    }

    let time_elapsed = (current_time - state.last_reward_time) as u64;
    let reward = (time_elapsed as u128)
        .checked_mul(state.reward_per_second as u128)
        .ok_or(StakingError::ArithmeticOverflow)?;
    let acc_increment = reward
        .checked_mul(ACC_REWARD_PRECISION)
        .ok_or(StakingError::ArithmeticOverflow)?
        .checked_div(total_staked as u128)
        .ok_or(StakingError::ArithmeticOverflow)?;
    state
        .acc_reward_per_share
        .checked_add(acc_increment)
        .ok_or_else(|| error!(StakingError::ArithmeticOverflow))
}

pub fn update_pool(state: &mut Account<GlobalState>, clock: &Sysvar<Clock>) -> Result<()> {
    let current_time = clock.unix_timestamp;
    if current_time <= state.last_reward_time {
        return Ok(());
    }

    if state.total_staked > 0 {
        let new_acc = calculate_acc_reward_per_share(state, current_time)?;
        state.acc_reward_per_share = new_acc;
    }

    state.last_reward_time = current_time;
    Ok(())
}

pub fn pending_reward(
    state: &GlobalState,
    user_stake: &UserStakeInfo,
    current_time: i64,
) -> Result<u64> {
    let acc_reward_per_share = calculate_acc_reward_per_share(state, current_time)?;
    let accumulated = calculate_accumulated_reward(user_stake.amount, acc_reward_per_share)?;
    let pending = accumulated
        .checked_sub(user_stake.reward_debt)
        .ok_or_else(|| error!(StakingError::ArithmeticOverflow))?;
    if pending <= 0 {
        return Ok(0);
    }
    u64::try_from(pending).map_err(|_| error!(StakingError::ArithmeticOverflow))
}

pub fn claim_pending_rewards<'info>(
    state: &mut Account<'info, GlobalState>,
    user_stake: &mut Account<'info, UserStakeInfo>,
    reward_vault: &Account<'info, TokenAccount>,
    user_reward_account: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
    clock: &Sysvar<'info, Clock>,
) -> Result<u64> {
    update_pool(state, clock)?;

    let accumulated = calculate_accumulated_reward(user_stake.amount, state.acc_reward_per_share)?;
    let pending = accumulated
        .checked_sub(user_stake.reward_debt)
        .ok_or_else(|| error!(StakingError::ArithmeticOverflow))?;

    user_stake.reward_debt = accumulated;

    if pending > 0 {
        let rewards =
            u64::try_from(pending).map_err(|_| error!(StakingError::ArithmeticOverflow))?;

        let seeds = &[STATE_SEED.as_ref(), state.staking_mint.as_ref(), &[state.bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: reward_vault.to_account_info(),
            to: user_reward_account.to_account_info(),
            authority: state.to_account_info(),
        };
        let cpi_program = token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, rewards)?;

        user_stake.claimed = user_stake
            .claimed
            .checked_add(rewards)
            .ok_or(StakingError::ArithmeticOverflow)?;

        return Ok(rewards);
    }

    Ok(0)
}

pub fn reward_debt_delta(amount: u64, acc_reward_per_share: u128) -> Result<i128> {
    calculate_reward_debt_delta(amount, acc_reward_per_share)
}
