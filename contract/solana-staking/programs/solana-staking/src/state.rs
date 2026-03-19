use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PoolConfig {
    pub admin: Pubkey,
    pub pool_id: Pubkey,
    pub staking_mint: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_per_second: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct PoolState {
    pub pool_config: Pubkey,
    pub acc_reward_per_share: u128,
    pub last_reward_time: i64,
    pub total_staked: u64,
    pub total_reward_debt: i128,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserStakeInfo {
    pub amount: u64,
    pub reward_debt: i128,
    pub bump: u8,
}

#[account]
pub struct BlacklistEntry;
