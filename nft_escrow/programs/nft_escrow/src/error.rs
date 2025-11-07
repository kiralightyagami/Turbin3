use anchor_lang::prelude::*;

#[error_code]
pub enum NftEscrowError {
    #[msg("Escrow has already been accepted")]
    EscrowAlreadyAccepted,
    #[msg("Escrow has already been completed")]
    EscrowAlreadyCompleted,
    #[msg("Escrow has not been accepted yet")]
    EscrowNotAccepted,
    #[msg("Cannot cancel escrow after it has been accepted")]
    CannotCancelAfterAcceptance,
    #[msg("Invalid NFT owner")]
    InvalidNftOwner,
    #[msg("Invalid taker")]
    InvalidTaker,
}

