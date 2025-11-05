use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::EscrowState;
use crate::error::EscrowError;
use crate::constants::*;

pub fn close_escrow(ctx: Context<CloseEscrow>) -> Result<()> {
    let _escrow_state = &ctx.accounts.escrow_state;

    // Verify escrow token account is empty
    let escrow_token_account = &ctx.accounts.escrow_token_account;
    require!(
        escrow_token_account.amount == 0,
        EscrowError::EscrowNotEmpty
    );

    msg!("Escrow closed successfully!");

    Ok(())
}

#[derive(Accounts)]
pub struct CloseEscrow<'info> {
    #[account(
        mut,
        seeds = [
            ESCROW_STATE_SEED,
            maker.key().as_ref(),
            escrow_state.taker.as_ref(),
            escrow_state.mint.as_ref()
        ],
        bump = escrow_state.bump,
        has_one = maker,
        close = maker,
    )]
    pub escrow_state: Account<'info, EscrowState>,
    
    #[account(
        mut,
        seeds = [ESCROW_TOKEN_SEED, escrow_state.key().as_ref()],
        bump,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub maker: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}
