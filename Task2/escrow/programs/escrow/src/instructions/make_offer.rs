use crate::{errors::EscrowError, state::*};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct MakeOffer<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub token_mint_a: InterfaceAccount<'info, Mint>,

    #[account(mint::token_program = token_program)]
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program,
    )]
    pub maker_token_account_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = maker,
        space = Escrow::DISCRIMINATOR.len() + Escrow::INIT_SPACE,
        seeds = [b"escrow", maker.key().as_ref(), id.to_le_bytes().as_ref()],
        bump,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        init,
        payer = maker,
        associated_token::mint = token_mint_a,
        associated_token::authority = escrow,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
impl<'info> MakeOffer<'info> {
    pub fn _make_offer(
        &mut self,
        id: u64,
        token_a_offered_amount: u64,
        token_b_expected_amount: u64,
        bump: &MakeOfferBumps,
    ) -> Result<()> {
        // Validate offered and expected amounts
        require!(token_a_offered_amount > 0, EscrowError::InvalidAmount);
        require!(token_b_expected_amount > 0, EscrowError::InvalidAmount);

        // Validate token mint a and b are different
        require!(
            self.token_mint_a.key() != self.token_mint_b.key(),
            EscrowError::InvalidTokenMint
        );

        // Verify maker has enough balance
        require!(
            self.maker_token_account_a.amount > token_a_offered_amount,
            EscrowError::InsufficientMakerBalance
        );

        let decimals = self.token_mint_a.decimals;

        // Move offered tokens from the maker to the vault
        let transfer_accounts = TransferChecked {
            mint: self.token_mint_a.to_account_info(),
            from: self.maker_token_account_a.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.maker.to_account_info(),
        };

        let transfer_ctx = CpiContext::new(self.token_program.to_account_info(), transfer_accounts);

        transfer_checked(transfer_ctx, token_a_offered_amount, decimals)?;

        // Save the details of the offer to the offer account
        self.escrow.set_inner(Escrow {
            id,
            maker: self.maker.key(),
            token_mint_a: self.token_mint_a.key(),
            token_mint_b: self.token_mint_b.key(),
            token_b_expected_amount,
            bump: bump.escrow,
        });

        Ok(())
    }
}
