use anchor_lang::prelude::*;
use crate::state::NftEscrowState;
use crate::error::NftEscrowError;
use crate::constants::*;

pub fn complete(
    ctx: Context<Complete>,
) -> Result<()> {
    let escrow_state = &ctx.accounts.escrow_state;
    
    require!(
        !escrow_state.is_completed,
        NftEscrowError::EscrowAlreadyCompleted
    );
    
    require!(
        escrow_state.is_accepted,
        NftEscrowError::EscrowNotAccepted
    );

    // Note: Actual NFT swap should be done via client-side using Metaplex Core SDK:
    // 1. Transfer maker's NFT from escrow PDA to taker
    // 2. Transfer taker's NFT from escrow PDA to maker
    // Or via CPI to Metaplex Core program.
    
    let escrow_state = &mut ctx.accounts.escrow_state;
    escrow_state.is_completed = true;

    msg!("NFT Escrow completed!");
    msg!("Maker receives NFT: {}", escrow_state.taker_nft);
    msg!("Taker receives NFT: {}", escrow_state.maker_nft);

    Ok(())
}

#[derive(Accounts)]
pub struct Complete<'info> {
    #[account(
        mut,
        seeds = [
            NFT_ESCROW_STATE_SEED,
            escrow_state.maker.as_ref(),
            escrow_state.taker.as_ref(),
            escrow_state.maker_nft.as_ref()
        ],
        bump = escrow_state.bump,
    )]
    pub escrow_state: Account<'info, NftEscrowState>,
    
    /// CHECK: Maker's NFT account
    pub maker_nft: AccountInfo<'info>,
    
    /// CHECK: Taker's NFT account
    pub taker_nft: AccountInfo<'info>,
    
    /// CHECK: Maker account
    pub maker: AccountInfo<'info>,
    
    /// CHECK: Taker account
    pub taker: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

