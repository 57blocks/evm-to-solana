use crate::constants::*;
use crate::errors::StakingError;
use crate::events::RewardsFunded;
use crate::state::GlobalState;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct FundRewards<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [STATE_SEED, state.staking_mint.as_ref()],
        bump = state.bump,
        has_one = admin
    )]
    pub state: Box<Account<'info, GlobalState>>,

    #[account(
        mut,
        token::mint = state.reward_mint,
        token::authority = admin
    )]
    pub admin_reward_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [REWARD_VAULT_SEED, state.key().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn fund_rewards_handler(ctx: Context<FundRewards>, amount: u64) -> Result<()> {
    require!(amount > 0, StakingError::InvalidFundAmount);

    let cpi_accounts = Transfer {
        from: ctx.accounts.admin_reward_account.to_account_info(),
        to: ctx.accounts.reward_vault.to_account_info(),
        authority: ctx.accounts.admin.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    emit!(RewardsFunded {
        funder: ctx.accounts.admin.key(),
        amount,
        timestamp: ctx.accounts.clock.unix_timestamp,
    });

    Ok(())
}
