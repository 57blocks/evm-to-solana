use crate::constants::*;
use crate::errors::StakingError;
use crate::events::RemainingRewardsWithdrawn;
use crate::state::{PoolConfig, PoolState};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct WithdrawRemainingRewards<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [POOL_CONFIG_SEED, pool_config.pool_id.as_ref()],
        bump = pool_config.bump,
        has_one = admin
    )]
    pub pool_config: Box<Account<'info, PoolConfig>>,

    #[account(
        seeds = [POOL_STATE_SEED, pool_config.key().as_ref()],
        bump = pool_state.bump,
        has_one = pool_config
    )]
    pub pool_state: Box<Account<'info, PoolState>>,

    #[account(
        mut,
        token::mint = pool_config.reward_mint,
        token::authority = admin
    )]
    pub admin_reward_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [REWARD_VAULT_SEED, pool_config.key().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn withdraw_remaining_rewards_handler(
    ctx: Context<WithdrawRemainingRewards>,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, StakingError::InvalidWithdrawAmount);
    require!(
        ctx.accounts.pool_state.total_staked == 0,
        StakingError::PoolHasActiveStakes
    );
    require!(
        amount <= ctx.accounts.reward_vault.amount,
        StakingError::InsufficientRewardVaultBalance
    );

    let pool_config = &ctx.accounts.pool_config;
    let seeds = &[
        POOL_CONFIG_SEED.as_ref(),
        pool_config.pool_id.as_ref(),
        &[pool_config.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.reward_vault.to_account_info(),
        to: ctx.accounts.admin_reward_account.to_account_info(),
        authority: pool_config.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::transfer(cpi_ctx, amount)?;

    emit!(RemainingRewardsWithdrawn {
        pool: pool_config.pool_id,
        admin: ctx.accounts.admin.key(),
        amount,
        timestamp: ctx.accounts.clock.unix_timestamp,
    });

    Ok(())
}
