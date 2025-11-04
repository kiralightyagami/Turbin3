use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::VaultState;
use crate::constants::*;

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let vault_state = &mut ctx.accounts.vault_state;
    vault_state.owner = ctx.accounts.owner.key();
    vault_state.mint = ctx.accounts.mint.key();
    vault_state.vault_bump = ctx.bumps.vault_state;
    vault_state.total_locked = 0;
    
    msg!("Vault initialized!");
    msg!("Owner: {}", vault_state.owner);
    msg!("Mint: {}", vault_state.mint);
    
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + VaultState::INIT_SPACE,
        seeds = [VAULT_STATE_SEED, owner.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,
    
    #[account(
        init,
        payer = owner,
        seeds = [VAULT_TOKEN_SEED, vault_state.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vault_state,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

