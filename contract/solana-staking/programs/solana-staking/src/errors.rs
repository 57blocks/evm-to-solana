use anchor_lang::prelude::*;

#[error_code]
pub enum StakingError {
    #[msg("Cannot stake 0 tokens")]
    InvalidStakeAmount,

    #[msg("Cannot unstake 0 tokens")]
    InvalidUnstakeAmount,

    #[msg("Insufficient staked amount")]
    InsufficientStakedAmount,

    #[msg("Invalid reward per second")]
    InvalidRewardPerSecond,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Address is blacklisted")]
    AddressBlacklisted,

    #[msg("Cannot blacklist zero address")]
    CannotBlacklistZeroAddress,

    #[msg("Invalid fund amount")]
    InvalidFundAmount,

    #[msg("Invalid withdraw amount")]
    InvalidWithdrawAmount,

    #[msg("Nothing to withdraw")]
    NothingToWithdraw,

    #[msg("Invalid pool ID")]
    InvalidPoolId,

    #[msg("User stake amount must be 0 to close account")]
    UserStakeAmountNotZero,

    #[msg("User reward debt must be 0 to close account")]
    UserRewardDebtNotZero,

    #[msg("Claim rewards before fully unstaking")]
    MustClaimRewardsBeforeFullUnstake,

    #[msg("Pool has active stakers")]
    PoolHasActiveStakes,

    #[msg("Vault must be empty")]
    VaultNotEmpty,

    #[msg("Insufficient reward vault balance")]
    InsufficientRewardVaultBalance,

    #[msg("No active stake to claim rewards")]
    NoActiveStake,
}
