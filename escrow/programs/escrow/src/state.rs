use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct EscrowState {
    pub maker: Pubkey,
    pub taker: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub unlock_time: i64,
    pub bump: u8,
    pub is_completed: bool,
}
