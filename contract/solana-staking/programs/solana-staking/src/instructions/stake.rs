use crate::constants::*;
use crate::errors::StakingError;
use crate::events::Staked;
use crate::state::{PoolConfig, PoolState, UserStakeInfo};
use crate::utils::{calculate_share_value, update_pool};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct Stake<'info> {
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
        init_if_needed,
        payer = user,
        space = 8 + UserStakeInfo::INIT_SPACE,
        seeds = [STAKE_SEED, pool_config.key().as_ref(), user.key().as_ref()],
        bump
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
        seeds = [STAKING_TOKEN_SEED, pool_config.key().as_ref()],
        bump
    )]
    pub staking_token: Account<'info, TokenAccount>,

    /// CHECK: This account may or may not exist - we check if it exists to determine blacklist status
    #[account(
        seeds = [BLACKLIST_SEED, pool_config.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub blacklist_entry: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn stake_handler(ctx: Context<Stake>, amount: u64) -> Result<()> {
    require!(amount > 0, StakingError::InvalidStakeAmount);

    let blacklist_info = &ctx.accounts.blacklist_entry.to_account_info();
    require!(
        blacklist_info.data_is_empty() || blacklist_info.lamports() == 0,
        StakingError::AddressBlacklisted
    );

    let pool_config = &ctx.accounts.pool_config;
    let pool_state = &mut ctx.accounts.pool_state;
    let user_stake = &mut ctx.accounts.user_stake_info;
    let clock = Clock::get()?;

    update_pool(pool_config, pool_state, &clock)?;

    // Transfer staking tokens from user to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.staking_token.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // Update user stake info
    user_stake.amount += amount;
    let debt_delta = calculate_share_value(amount, pool_state.acc_reward_per_share)?;
    user_stake.reward_debt += debt_delta;
    user_stake.bump = ctx.bumps.user_stake_info;

    // Update pool state
    pool_state.total_staked += amount;
    pool_state.total_reward_debt += debt_delta;

    // Emit staked event
    emit!(Staked {
        pool: pool_config.pool_id,
        user: ctx.accounts.user.key(),
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
