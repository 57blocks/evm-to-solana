use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("EDgQa4GCRN8Xz6UYtMBxyVDcv7PyJ7NgMTcWHzqgcnpX");

#[program]
pub mod solana_staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, reward_per_second: u64) -> Result<()> {
        instructions::initialize::initialize_handler(ctx, reward_per_second)
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        instructions::stake::stake_handler(ctx, amount)
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        instructions::unstake::unstake_handler(ctx, amount)
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::claim_rewards::claim_rewards_handler(ctx)
    }

    pub fn fund_rewards(ctx: Context<FundRewards>, amount: u64) -> Result<()> {
        instructions::fund_rewards::fund_rewards_handler(ctx, amount)
    }

    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>) -> Result<()> {
        instructions::emergency_withdraw::emergency_withdraw_handler(ctx)
    }

    pub fn add_to_blacklist(ctx: Context<AddToBlacklist>, address: Pubkey) -> Result<()> {
        instructions::add_to_blacklist::add_to_blacklist_handler(ctx, address)
    }

    pub fn remove_from_blacklist(ctx: Context<RemoveFromBlacklist>, address: Pubkey) -> Result<()> {
        instructions::remove_from_blacklist::remove_from_blacklist_handler(ctx, address)
    }
}
