use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct NftEscrowState {
    pub maker: Pubkey,
    pub taker: Pubkey,
    pub maker_nft: Pubkey,
    pub taker_nft: Pubkey,
    pub bump: u8,
    pub is_accepted: bool,
    pub is_completed: bool,
}

