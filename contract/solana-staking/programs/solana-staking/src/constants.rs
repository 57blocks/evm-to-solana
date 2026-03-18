// PDA seed constants
pub const POOL_CONFIG_SEED: &[u8] = b"pool_config";
pub const POOL_STATE_SEED: &[u8] = b"pool_state";
pub const STAKE_SEED: &[u8] = b"stake";
pub const STAKING_TOKEN_SEED: &[u8] = b"staking_token";
pub const REWARD_VAULT_SEED: &[u8] = b"reward_vault";
pub const BLACKLIST_SEED: &[u8] = b"blacklist";

// Precision for accRewardPerShare (matches EVM precision)
pub const ACC_REWARD_PRECISION: u128 = 1_000_000_000_000;
