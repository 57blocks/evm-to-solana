use crate::constants::*;
use crate::errors::StakingError;
use crate::events::AddedToBlacklist;
use crate::state::{BlacklistEntry, PoolConfig};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(address: Pubkey)]
pub struct AddToBlacklist<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [POOL_CONFIG_SEED, pool_config.pool_id.as_ref()],
        bump = pool_config.bump,
        has_one = admin
    )]
    pub pool_config: Box<Account<'info, PoolConfig>>,

    #[account(
        init,
        payer = admin,
        space = 8,
        seeds = [BLACKLIST_SEED, pool_config.key().as_ref(), address.as_ref()],
        bump
    )]
    pub blacklist_entry: Box<Account<'info, BlacklistEntry>>,

    pub system_program: Program<'info, System>,
}

pub fn add_to_blacklist_handler(ctx: Context<AddToBlacklist>, address: Pubkey) -> Result<()> {
    require!(
        address != Pubkey::default(),
        StakingError::CannotBlacklistZeroAddress
    );

    let clock = Clock::get()?;

    // Emit event
    emit!(AddedToBlacklist {
        pool: ctx.accounts.pool_config.pool_id,
        address,
        admin: ctx.accounts.admin.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
