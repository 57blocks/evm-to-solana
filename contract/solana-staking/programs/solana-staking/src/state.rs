use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GlobalState {
    pub admin: Pubkey,
    pub staking_mint: Pubkey,
    pub reward_mint: Pubkey,
    pub staking_vault: Pubkey,
    pub reward_vault: Pubkey,
    pub reward_per_second: u64,
    pub acc_reward_per_share: u128,
    pub last_reward_time: i64,
    pub total_staked: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserStakeInfo {
    pub owner: Pubkey,
    pub amount: u64,
    pub reward_debt: i128,
    pub claimed: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BlacklistEntry {
    pub address: Pubkey,
    pub added_at: i64,
    pub bump: u8,
}
