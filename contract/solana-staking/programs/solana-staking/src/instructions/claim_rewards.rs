use crate::constants::*;
use crate::events::RewardsClaimed;
use crate::state::{PoolConfig, PoolState, UserStakeInfo};
use crate::utils::claim_pending_rewards;
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
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
        token::mint = pool_config.reward_mint,
        token::authority = user
    )]
    pub user_reward_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [REWARD_VAULT_SEED, pool_config.key().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn claim_rewards_handler(ctx: Context<ClaimRewards>) -> Result<()> {
    let pool_config = &ctx.accounts.pool_config;
    let pool_state = &mut ctx.accounts.pool_state;
    let user_stake = &mut ctx.accounts.user_stake_info;
    let clock = Clock::get()?;

    let rewards = claim_pending_rewards(
        pool_config,
        pool_state,
        user_stake,
        &ctx.accounts.reward_vault,
        &ctx.accounts.user_reward_account,
        &ctx.accounts.token_program,
        &clock,
    )?;

    if rewards > 0 {
        // Emit rewards claimed event
        emit!(RewardsClaimed {
            pool: pool_config.pool_id,
            user: ctx.accounts.user.key(),
            amount: rewards,
            timestamp: clock.unix_timestamp,
        });
    }

    Ok(())
}
