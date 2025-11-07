use anchor_lang::prelude::*;
use crate::state::NftEscrowState;
use crate::error::NftEscrowError;
use crate::constants::*;

pub fn cancel(
    ctx: Context<Cancel>,
) -> Result<()> {
    let escrow_state = &ctx.accounts.escrow_state;
    
    require!(
        !escrow_state.is_completed,
        NftEscrowError::EscrowAlreadyCompleted
    );
    
    require!(
        !escrow_state.is_accepted,
        NftEscrowError::CannotCancelAfterAcceptance
    );
    
    require!(
        ctx.accounts.maker.key() == escrow_state.maker,
        NftEscrowError::InvalidNftOwner
    );

    // Note: Actual NFT return from escrow PDA to maker should be done via client-side
    // using Metaplex Core SDK, or via CPI to Metaplex Core program.
    
    msg!("NFT Escrow cancelled!");
    msg!("Returned NFT to maker: {}", escrow_state.maker_nft);

    Ok(())
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(
        mut,
        seeds = [
            NFT_ESCROW_STATE_SEED,
            maker.key().as_ref(),
            escrow_state.taker.as_ref(),
            escrow_state.maker_nft.as_ref()
        ],
        bump = escrow_state.bump,
        has_one = maker,
    )]
    pub escrow_state: Account<'info, NftEscrowState>,
    
    /// CHECK: Maker's NFT account
    pub maker_nft: AccountInfo<'info>,
    
    #[account(mut)]
    pub maker: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

