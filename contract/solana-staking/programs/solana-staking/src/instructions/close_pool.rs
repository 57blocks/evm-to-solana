use crate::constants::*;
use crate::errors::StakingError;
use crate::events::PoolClosed;
use crate::state::{PoolConfig, PoolState};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Token, TokenAccount};

#[derive(Accounts)]
pub struct ClosePool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        close = admin,
        seeds = [POOL_CONFIG_SEED, pool_config.pool_id.as_ref()],
        bump = pool_config.bump,
        has_one = admin
    )]
    pub pool_config: Box<Account<'info, PoolConfig>>,

    #[account(
        mut,
        close = admin,
        seeds = [POOL_STATE_SEED, pool_config.key().as_ref()],
        bump = pool_state.bump,
        has_one = pool_config
    )]
    pub pool_state: Box<Account<'info, PoolState>>,

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

    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn close_pool_handler(ctx: Context<ClosePool>) -> Result<()> {
    let pool_config = &ctx.accounts.pool_config;
    let pool_state = &ctx.accounts.pool_state;

    require!(
        pool_state.total_staked == 0,
        StakingError::PoolHasActiveStakes
    );
    require!(
        ctx.accounts.staking_vault.amount == 0,
        StakingError::VaultNotEmpty
    );
    require!(
        ctx.accounts.reward_vault.amount == 0,
        StakingError::VaultNotEmpty
    );

    let seeds = &[
        POOL_CONFIG_SEED.as_ref(),
        pool_config.pool_id.as_ref(),
        &[pool_config.bump],
    ];
    let signer = &[&seeds[..]];

    let close_staking_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.staking_vault.to_account_info(),
            destination: ctx.accounts.admin.to_account_info(),
            authority: pool_config.to_account_info(),
        },
        signer,
    );
    token::close_account(close_staking_ctx)?;

    let close_reward_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.reward_vault.to_account_info(),
            destination: ctx.accounts.admin.to_account_info(),
            authority: pool_config.to_account_info(),
        },
        signer,
    );
    token::close_account(close_reward_ctx)?;

    emit!(PoolClosed {
        pool: pool_config.pool_id,
        admin: ctx.accounts.admin.key(),
        timestamp: ctx.accounts.clock.unix_timestamp,
    });

    Ok(())
}
