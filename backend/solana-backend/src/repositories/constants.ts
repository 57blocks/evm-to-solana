/**
 * On-chain PDA seed constants — must match contract/solana-staking/programs/solana-staking/src/constants.rs
 */
export const POOL_CONFIG_SEED = "pool_config";
export const POOL_STATE_SEED = "pool_state";
export const STAKE_SEED = "stake";
export const STAKING_TOKEN_SEED = "staking_token";
export const REWARD_VAULT_SEED = "reward_vault";
export const BLACKLIST_SEED = "blacklist";

/**
 * Reward precision multiplier — must match contract ACC_REWARD_PRECISION (1e12)
 */
export const ACC_REWARD_PRECISION = 1_000_000_000_000n;
