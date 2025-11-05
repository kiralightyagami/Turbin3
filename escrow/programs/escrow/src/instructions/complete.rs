use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::EscrowState;
use crate::error::EscrowError;
use crate::constants::*;

pub fn complete(ctx: Context<Complete>) -> Result<()> {
    let escrow_state = &ctx.accounts.escrow_state;
    
    require!(
        !escrow_state.is_completed,
        EscrowError::EscrowAlreadyCompleted
    );

    let current_time = Clock::get()?.unix_timestamp;
    require!(
        current_time >= escrow_state.unlock_time,
        EscrowError::UnlockTimeNotReached
    );

    // Transfer tokens from escrow to taker
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
        to: ctx.accounts.taker_token_account.to_account_info(),
        authority: ctx.accounts.escrow_state.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    
    token::transfer(cpi_ctx, escrow_state.amount)?;

    // Mark as completed
    let escrow_state = &mut ctx.accounts.escrow_state;
    escrow_state.is_completed = true;

    msg!("Escrow completed!");
    msg!("Transferred {} tokens to taker", escrow_state.amount);

    Ok(())
}

#[derive(Accounts)]
pub struct Complete<'info> {
    #[account(
        mut,
        seeds = [
            ESCROW_STATE_SEED,
            escrow_state.maker.as_ref(),
            taker.key().as_ref(),
            escrow_state.mint.as_ref()
        ],
        bump = escrow_state.bump,
        has_one = taker,
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
        token::authority = taker,
    )]
    pub taker_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub taker: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}
