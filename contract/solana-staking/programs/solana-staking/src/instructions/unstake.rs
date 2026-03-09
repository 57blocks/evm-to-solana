use crate::constants::*;
use crate::errors::StakingError;
use crate::events::Unstaked;
use crate::state::{PoolConfig, PoolState, UserStakeInfo};
use crate::utils::{pending_reward, reward_debt_delta, update_pool};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [POOL_CONFIG_SEED, pool_config.pool_id.as_ref()],
        bump = pool_config.bump
    )]
    pub pool_config: Box<Account<'info, PoolConfig>>,

    #[account(
        mut,
        seeds = [POOL_STATE_SEED, pool_config.key().as_ref()],
        bump = pool_state.bump,
        has_one = pool_config
    )]
    pub pool_state: Box<Account<'info, PoolState>>,

    #[account(
        mut,
        seeds = [STAKE_SEED, pool_config.key().as_ref(), user.key().as_ref()],
        bump = user_stake_info.bump
    )]
    pub user_stake_info: Box<Account<'info, UserStakeInfo>>,

    #[account(
        mut,
        token::mint = pool_config.staking_mint,
        token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [STAKING_VAULT_SEED, pool_config.key().as_ref()],
        bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [REWARD_VAULT_SEED, pool_config.key().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = pool_config.reward_mint,
        token::authority = user
    )]
    pub user_reward_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn unstake_handler(ctx: Context<Unstake>, amount: u64) -> Result<()> {
    require!(amount > 0, StakingError::InvalidUnstakeAmount);

    let pool_config = &ctx.accounts.pool_config;
    let pool_state = &mut ctx.accounts.pool_state;
    let user_stake = &mut ctx.accounts.user_stake_info;
    let clock = &ctx.accounts.clock;

    require!(
        user_stake.amount >= amount,
        StakingError::InsufficientStakedAmount
    );

    update_pool(pool_config, pool_state, clock)?;

    if user_stake.amount == amount {
        let pending_rewards = pending_reward(pool_config, pool_state, user_stake, clock.unix_timestamp)?;
        require!(
            pending_rewards == 0,
            StakingError::MustClaimRewardsBeforeFullUnstake
        );
    }

    // Transfer staking tokens back to user
    let seeds = &[
        POOL_CONFIG_SEED.as_ref(),
        pool_config.pool_id.as_ref(),
        &[pool_config.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.staking_vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: pool_config.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::transfer(cpi_ctx, amount)?;

    // Update user stake info
    user_stake.amount -= amount;
    let debt_delta = reward_debt_delta(amount, pool_state.acc_reward_per_share)?;
    user_stake.reward_debt -= debt_delta;

    // Update pool state
    pool_state.total_staked -= amount;

    // Emit unstaked event
    emit!(Unstaked {
        pool: pool_config.pool_id,
        user: ctx.accounts.user.key(),
        amount,
        rewards: 0,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
