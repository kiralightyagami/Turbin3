use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
        TransferChecked,
    },
};

#[derive(Accounts)]
pub struct RefundOffer<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    pub token_mint_a: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program,
    )]
    pub maker_token_account_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        close = maker,
        has_one = maker,
        seeds = [b"escrow", maker.key().as_ref(), escrow.id.to_le_bytes().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = escrow,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
impl<'info> RefundOffer<'info> {
    pub fn _refund_offer(&self) -> Result<()> {
        let offer_account_seeds = &[
            b"escrow",
            self.maker.to_account_info().key.as_ref(),
            &self.escrow.id.to_le_bytes()[..],
            &[self.escrow.bump],
        ];
        let signers_seeds = &[&offer_account_seeds[..]];

        let decimals = self.token_mint_a.decimals;

        // Withdraw offered tokens from the vault to the maker
        let transfer_accounts = TransferChecked {
            mint: self.token_mint_a.to_account_info(),
            from: self.vault.to_account_info(),
            to: self.maker_token_account_a.to_account_info(),
            authority: self.escrow.to_account_info(),
        };

        let transfer_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            transfer_accounts,
            signers_seeds,
        );

        transfer_checked(transfer_ctx, self.vault.amount, decimals)?;

        // Close the vault and return rent to the maker
        let close_accounts = CloseAccount {
            account: self.vault.to_account_info(),
            destination: self.maker.to_account_info(),
            authority: self.escrow.to_account_info(),
        };

        let close_account_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            close_accounts,
            signers_seeds,
        );

        close_account(close_account_ctx)?;

        Ok(())
    }
}
