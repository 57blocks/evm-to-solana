use crate::constants::*;
use crate::errors::StakingError;
use crate::events::PoolCreated;
use crate::state::GlobalState;
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
        space = 8 + GlobalState::INIT_SPACE,
        seeds = [STATE_SEED, pool_id.as_ref()],
        bump
    )]
    pub state: Box<Account<'info, GlobalState>>,

    pub staking_mint: Account<'info, Mint>,
    pub reward_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        token::mint = staking_mint,
        token::authority = state,
        seeds = [STAKING_VAULT_SEED, state.key().as_ref()],
        bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = admin,
        token::mint = reward_mint,
        token::authority = state,
        seeds = [REWARD_VAULT_SEED, state.key().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn create_pool_handler(ctx: Context<CreatePool>, pool_id: Pubkey, reward_per_second: u64) -> Result<()> {
    require!(pool_id != Pubkey::default(), StakingError::InvalidPoolId);

    let state = &mut ctx.accounts.state;

    state.admin = ctx.accounts.admin.key();
    state.pool_id = pool_id;
    state.staking_mint = ctx.accounts.staking_mint.key();
    state.reward_mint = ctx.accounts.reward_mint.key();
    require!(
        reward_per_second > 0,
        StakingError::InvalidRewardPerSecond
    );
    state.reward_per_second = reward_per_second;
    state.acc_reward_per_share = 0;
    state.last_reward_time = ctx.accounts.clock.unix_timestamp;
    state.total_staked = 0;
    state.bump = ctx.bumps.state;

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
