use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::VaultState;
use crate::error::VaultError;
use crate::constants::*;

pub fn close(ctx: Context<Close>) -> Result<()> {
    let vault_state = &ctx.accounts.vault_state;
    require!(
        vault_state.total_locked == 0,
        VaultError::VaultNotEmpty
    );

    msg!("Vault closed successfully!");
    
    Ok(())
}

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(
        mut,
        seeds = [VAULT_STATE_SEED, owner.key().as_ref(), mint.key().as_ref()],
        bump = vault_state.vault_bump,
        has_one = owner,
        close = owner,
    )]
    pub vault_state: Account<'info, VaultState>,
    
    #[account(
        mut,
        seeds = [VAULT_TOKEN_SEED, vault_state.key().as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

