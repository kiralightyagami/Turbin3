use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use crate::state::EscrowState;
use crate::error::EscrowError;
use crate::constants::*;

pub fn initialize(
    ctx: Context<Initialize>,
    amount: u64,
    unlock_time: i64,
) -> Result<()> {
    require!(amount > 0, EscrowError::InvalidAmount);
    require!(
        unlock_time > Clock::get()?.unix_timestamp,
        EscrowError::InvalidUnlockTime
    );

    let escrow_state = &mut ctx.accounts.escrow_state;
    escrow_state.maker = ctx.accounts.maker.key();
    escrow_state.taker = ctx.accounts.taker.key();
    escrow_state.mint = ctx.accounts.mint.key();
    escrow_state.amount = amount;
    escrow_state.unlock_time = unlock_time;
    escrow_state.bump = ctx.bumps.escrow_state;
    escrow_state.is_completed = false;

    // Transfer tokens from maker to escrow
    let cpi_accounts = Transfer {
        from: ctx.accounts.maker_token_account.to_account_info(),
        to: ctx.accounts.escrow_token_account.to_account_info(),
        authority: ctx.accounts.maker.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    token::transfer(cpi_ctx, amount)?;

    msg!("Escrow initialized!");
    msg!("Maker: {}", escrow_state.maker);
    msg!("Taker: {}", escrow_state.taker);
    msg!("Amount: {}", escrow_state.amount);
    msg!("Unlock time: {}", escrow_state.unlock_time);

    Ok(())
}

#[derive(Accounts)]
#[instruction(amount: u64, unlock_time: i64)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = maker,
        space = 8 + EscrowState::INIT_SPACE,
        seeds = [
            ESCROW_STATE_SEED,
            maker.key().as_ref(),
            taker.key().as_ref(),
            mint.key().as_ref()
        ],
        bump
    )]
    pub escrow_state: Account<'info, EscrowState>,
    
    #[account(
        init,
        payer = maker,
        seeds = [ESCROW_TOKEN_SEED, escrow_state.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = escrow_state,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        token::mint = mint,
        token::authority = maker,
    )]
    pub maker_token_account: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub maker: Signer<'info>,
    
    /// CHECK: Taker address is validated as a Pubkey
    pub taker: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
