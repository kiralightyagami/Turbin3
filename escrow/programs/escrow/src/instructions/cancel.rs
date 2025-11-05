use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::EscrowState;
use crate::error::EscrowError;
use crate::constants::*;

pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
    let escrow_state = &ctx.accounts.escrow_state;
    
    require!(
        !escrow_state.is_completed,
        EscrowError::EscrowAlreadyCompleted
    );

    let current_time = Clock::get()?.unix_timestamp;
    require!(
        current_time < escrow_state.unlock_time,
        EscrowError::CannotCancelAfterUnlockTime
    );

    // Transfer tokens back to maker
    let seeds = &[
        ESCROW_STATE_SEED,
        escrow_state.maker.as_ref(),
        escrow_state.taker.as_ref(),
        escrow_state.mint.as_ref(),
        &[escrow_state.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.escrow_token_account.to_account_info(),
        to: ctx.accounts.maker_token_account.to_account_info(),
        authority: ctx.accounts.escrow_state.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    
    token::transfer(cpi_ctx, escrow_state.amount)?;

    msg!("Escrow cancelled!");
    msg!("Returned {} tokens to maker", escrow_state.amount);

    Ok(())
}

#[derive(Accounts)]
pub struct Cancel<'info> {
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
    )]
    pub escrow_state: Account<'info, EscrowState>,
    
    #[account(
        mut,
        seeds = [ESCROW_TOKEN_SEED, escrow_state.key().as_ref()],
        bump,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        token::mint = escrow_state.mint,
        token::authority = maker,
    )]
    pub maker_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub maker: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}
