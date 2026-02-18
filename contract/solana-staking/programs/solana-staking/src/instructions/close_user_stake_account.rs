use crate::constants::*;
use crate::errors::StakingError;
use crate::events::UserStakeAccountClosed;
use crate::state::{PoolConfig, UserStakeInfo};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CloseUserStakeAccount<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [POOL_CONFIG_SEED, pool_config.pool_id.as_ref()],
        bump = pool_config.bump
    )]
    pub pool_config: Box<Account<'info, PoolConfig>>,

    #[account(
        mut,
        close = user,
        seeds = [STAKE_SEED, pool_config.key().as_ref(), user.key().as_ref()],
        bump = user_stake_info.bump
    )]
    pub user_stake_info: Box<Account<'info, UserStakeInfo>>,

    pub clock: Sysvar<'info, Clock>,
}

pub fn close_user_stake_account_handler(ctx: Context<CloseUserStakeAccount>) -> Result<()> {
    let user_stake_info = &ctx.accounts.user_stake_info;

    require!(
        user_stake_info.amount == 0,
        StakingError::UserStakeAmountNotZero
    );
    require!(
        user_stake_info.reward_debt == 0,
        StakingError::UserRewardDebtNotZero
    );

    emit!(UserStakeAccountClosed {
        pool: ctx.accounts.pool_config.pool_id,
        user: ctx.accounts.user.key(),
        timestamp: ctx.accounts.clock.unix_timestamp,
    });

    Ok(())
}
