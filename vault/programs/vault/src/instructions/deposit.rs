use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use crate::state::VaultState;
use crate::error::VaultError;
use crate::constants::*;

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, VaultError::InvalidAmount);

    // Transfer tokens from user to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    token::transfer(cpi_ctx, amount)?;

    // Update state
    let vault_state = &mut ctx.accounts.vault_state;
    vault_state.total_locked = vault_state.total_locked.checked_add(amount)
        .ok_or(VaultError::Overflow)?;

    msg!("Deposited {} tokens", amount);
    msg!("Total locked: {}", vault_state.total_locked);

    Ok(())
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [VAULT_STATE_SEED, owner.key().as_ref(), mint.key().as_ref()],
        bump = vault_state.vault_bump,
        has_one = owner,
        has_one = mint,
    )]
    pub vault_state: Account<'info, VaultState>,
    
    #[account(
        mut,
        seeds = [VAULT_TOKEN_SEED, vault_state.key().as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        token::mint = mint,
        token::authority = owner,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

