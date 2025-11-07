use anchor_lang::prelude::*;
use crate::state::NftEscrowState;
use crate::constants::*;

pub fn initialize(
    ctx: Context<Initialize>,
) -> Result<()> {
    let escrow_state = &mut ctx.accounts.escrow_state;
    escrow_state.maker = ctx.accounts.maker.key();
    escrow_state.taker = ctx.accounts.taker.key();
    escrow_state.maker_nft = ctx.accounts.maker_nft.key();
    escrow_state.taker_nft = Pubkey::default(); // Will be set when taker accepts
    escrow_state.bump = ctx.bumps.escrow_state;
    escrow_state.is_accepted = false;
    escrow_state.is_completed = false;

    // Note: Actual NFT transfer from maker to escrow PDA should be done via client-side
    // using Metaplex Core SDK before calling this instruction, or via CPI to Metaplex Core program.
    // This instruction creates the escrow state to track the trade.
    
    msg!("NFT Escrow initialized!");
    msg!("Maker: {}", escrow_state.maker);
    msg!("Taker: {}", escrow_state.taker);
    msg!("Maker NFT: {}", escrow_state.maker_nft);

    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = maker,
        space = 8 + NftEscrowState::INIT_SPACE,
        seeds = [
            NFT_ESCROW_STATE_SEED,
            maker.key().as_ref(),
            taker.key().as_ref(),
            maker_nft.key().as_ref()
        ],
        bump
    )]
    pub escrow_state: Account<'info, NftEscrowState>,
    
    /// CHECK: NFT account - validated by Metaplex Core
    pub maker_nft: AccountInfo<'info>,
    
    #[account(mut)]
    pub maker: Signer<'info>,
    
    /// CHECK: Taker address is validated as a Pubkey
    pub taker: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

