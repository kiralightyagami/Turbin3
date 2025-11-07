use anchor_lang::prelude::*;
use crate::state::NftEscrowState;
use crate::error::NftEscrowError;
use crate::constants::*;

pub fn accept(
    ctx: Context<Accept>,
) -> Result<()> {
    let escrow_state = &mut ctx.accounts.escrow_state;
    
    require!(
        !escrow_state.is_accepted,
        NftEscrowError::EscrowAlreadyAccepted
    );
    
    require!(
        ctx.accounts.taker.key() == escrow_state.taker,
        NftEscrowError::InvalidTaker
    );

    // Set taker's NFT
    escrow_state.taker_nft = ctx.accounts.taker_nft.key();
    escrow_state.is_accepted = true;

    // Note: Actual NFT transfer from taker to escrow PDA should be done via client-side
    // using Metaplex Core SDK before calling this instruction, or via CPI to Metaplex Core program.
    
    msg!("NFT Escrow accepted!");
    msg!("Taker NFT: {}", escrow_state.taker_nft);

    Ok(())
}

#[derive(Accounts)]
pub struct Accept<'info> {
    #[account(
        mut,
        seeds = [
            NFT_ESCROW_STATE_SEED,
            escrow_state.maker.as_ref(),
            taker.key().as_ref(),
            escrow_state.maker_nft.as_ref()
        ],
        bump = escrow_state.bump,
        has_one = taker,
    )]
    pub escrow_state: Account<'info, NftEscrowState>,
    
    /// CHECK: NFT account - validated by Metaplex Core
    pub taker_nft: AccountInfo<'info>,
    
    #[account(mut)]
    pub taker: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

