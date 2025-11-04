use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VaultState {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub vault_bump: u8,
    pub total_locked: u64,
}

