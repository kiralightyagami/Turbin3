use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    #[msg("Unlock time must be in the future")]
    InvalidUnlockTime,
    #[msg("Unlock time has not been reached yet")]
    UnlockTimeNotReached,
    #[msg("Escrow has already been completed")]
    EscrowAlreadyCompleted,
    #[msg("Cannot cancel escrow after unlock time")]
    CannotCancelAfterUnlockTime,
    #[msg("Escrow token account must be empty before closing")]
    EscrowNotEmpty,
}
