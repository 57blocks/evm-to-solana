use crate::constants::*;
use crate::errors::StakingError;
use crate::events::EmergencyWithdraw as EmergencyWithdrawEvent;
use crate::state::{GlobalState, UserStakeInfo};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [STATE_SEED, state.staking_mint.as_ref()],
        bump = state.bump
    )]
    pub state: Box<Account<'info, GlobalState>>,

    #[account(
        mut,
        seeds = [STAKE_SEED, state.key().as_ref(), user.key().as_ref()],
        bump = user_stake_info.bump
    )]
    pub user_stake_info: Box<Account<'info, UserStakeInfo>>,

    #[account(
        mut,
        token::mint = state.staking_mint,
        token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [STAKING_VAULT_SEED, state.key().as_ref()],
        bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    /// CHECK: This account may or may not exist - we check if it exists to determine blacklist status
    #[account(
        seeds = [BLACKLIST_SEED, state.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub blacklist_entry: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn emergency_withdraw_handler(ctx: Context<EmergencyWithdraw>) -> Result<()> {
    let blacklist_info = &ctx.accounts.blacklist_entry.to_account_info();
    require!(
        blacklist_info.data_is_empty() || blacklist_info.lamports() == 0,
        StakingError::AddressBlacklisted
    );

    let state = &mut ctx.accounts.state;
    let user_stake = &mut ctx.accounts.user_stake_info;

    let amount = user_stake.amount;
    require!(amount > 0, StakingError::NothingToWithdraw);

    user_stake.amount = 0;
    user_stake.reward_debt = 0;

    state.total_staked = state
        .total_staked
        .checked_sub(amount)
        .ok_or(StakingError::ArithmeticOverflow)?;

    let seeds = &[
        STATE_SEED.as_ref(),
        state.staking_mint.as_ref(),
        &[state.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.staking_vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: state.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::transfer(cpi_ctx, amount)?;

    emit!(EmergencyWithdrawEvent {
        user: ctx.accounts.user.key(),
        amount,
        timestamp: ctx.accounts.clock.unix_timestamp,
    });

    Ok(())
}
