use anchor_lang::prelude::*;

#[event]
pub struct Staked {
    pub pool: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct Unstaked {
    pub pool: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct RewardsClaimed {
    pub pool: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct PoolCreated {
    pub pool: Pubkey,
    pub authority: Pubkey,
    pub staking_mint: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_per_second: u64,
    pub timestamp: i64,
}

#[event]
pub struct RewardsFunded {
    pub pool: Pubkey,
    pub funder: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct AddedToBlacklist {
    pub pool: Pubkey,
    pub address: Pubkey,
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RemovedFromBlacklist {
    pub pool: Pubkey,
    pub address: Pubkey,
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct UserStakeAccountClosed {
    pub pool: Pubkey,
    pub user: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RemainingRewardsWithdrawn {
    pub pool: Pubkey,
    pub admin: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct PoolClosed {
    pub pool: Pubkey,
    pub admin: Pubkey,
    pub timestamp: i64,
}
