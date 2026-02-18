use crate::constants::*;
use crate::errors::StakingError;
use crate::events::PoolCreated;
use crate::state::{PoolConfig, PoolState};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
#[instruction(pool_id: Pubkey)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + PoolConfig::INIT_SPACE,
        seeds = [POOL_CONFIG_SEED, pool_id.as_ref()],
        bump
    )]
    pub pool_config: Box<Account<'info, PoolConfig>>,

    #[account(
        init,
        payer = admin,
        space = 8 + PoolState::INIT_SPACE,
        seeds = [POOL_STATE_SEED, pool_config.key().as_ref()],
        bump
    )]
    pub pool_state: Box<Account<'info, PoolState>>,

    pub staking_mint: Account<'info, Mint>,
    pub reward_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        token::mint = staking_mint,
        token::authority = pool_config,
        seeds = [STAKING_VAULT_SEED, pool_config.key().as_ref()],
        bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = admin,
        token::mint = reward_mint,
        token::authority = pool_config,
        seeds = [REWARD_VAULT_SEED, pool_config.key().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn create_pool_handler(
    ctx: Context<CreatePool>,
    pool_id: Pubkey,
    reward_per_second: u64,
) -> Result<()> {
    require!(pool_id != Pubkey::default(), StakingError::InvalidPoolId);
    require!(reward_per_second > 0, StakingError::InvalidRewardPerSecond);

    let pool_config = &mut ctx.accounts.pool_config;
    let pool_state = &mut ctx.accounts.pool_state;

    pool_config.admin = ctx.accounts.admin.key();
    pool_config.pool_id = pool_id;
    pool_config.staking_mint = ctx.accounts.staking_mint.key();
    pool_config.reward_mint = ctx.accounts.reward_mint.key();
    pool_config.reward_per_second = reward_per_second;
    pool_config.bump = ctx.bumps.pool_config;

    pool_state.pool_config = pool_config.key();
    pool_state.acc_reward_per_share = 0;
    pool_state.last_reward_time = ctx.accounts.clock.unix_timestamp;
    pool_state.total_staked = 0;
    pool_state.bump = ctx.bumps.pool_state;

    // Emit pool created event
    emit!(PoolCreated {
        pool: pool_id,
        authority: ctx.accounts.admin.key(),
        staking_mint: ctx.accounts.staking_mint.key(),
        reward_mint: ctx.accounts.reward_mint.key(),
        reward_per_second,
        timestamp: ctx.accounts.clock.unix_timestamp,
    });

    Ok(())
}
