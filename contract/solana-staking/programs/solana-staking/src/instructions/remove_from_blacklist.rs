use crate::constants::*;
use crate::events::RemovedFromBlacklist;
use crate::state::{BlacklistEntry, PoolConfig};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(address: Pubkey)]
pub struct RemoveFromBlacklist<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [POOL_CONFIG_SEED, pool_config.pool_id.as_ref()],
        bump = pool_config.bump,
        has_one = admin
    )]
    pub pool_config: Box<Account<'info, PoolConfig>>,

    #[account(
        mut,
        close = admin,
        seeds = [BLACKLIST_SEED, pool_config.key().as_ref(), address.as_ref()],
        bump
    )]
    pub blacklist_entry: Box<Account<'info, BlacklistEntry>>,
}

pub fn remove_from_blacklist_handler(
    ctx: Context<RemoveFromBlacklist>,
    address: Pubkey,
) -> Result<()> {
    let clock = Clock::get()?;

    // Emit event
    emit!(RemovedFromBlacklist {
        pool: ctx.accounts.pool_config.pool_id,
        address,
        admin: ctx.accounts.admin.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
