use crate::{errors::EscrowError, state::*};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
        TransferChecked,
    },
};

#[derive(Accounts)]
pub struct TakeOffer<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(mut)]
    pub maker: SystemAccount<'info>,

    pub token_mint_a: InterfaceAccount<'info, Mint>,

    pub token_mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed, // taker doesn't have mint_a account, create one
        payer = taker,
        associated_token::mint = token_mint_a,
        associated_token::authority = taker,
        associated_token::token_program = token_program,
    )]
    pub taker_token_account_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint_b,
        associated_token::authority = taker,
        associated_token::token_program = token_program,
    )]
    pub taker_token_account_b: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed, // maker doesn't have mint_b account, create one
        payer = taker,
        associated_token::mint = token_mint_b,
        associated_token::authority = maker,
        associated_token::token_program = token_program,
    )]
    pub maker_token_account_b: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        close = maker,
        has_one = maker,
        has_one = token_mint_b,
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
impl<'info> TakeOffer<'info> {
    pub fn _take_offer(&mut self) -> Result<()> {
        // Verify taker has enough balance
        require!(
            self.taker_token_account_b.amount > self.escrow.token_b_expected_amount,
            EscrowError::InsufficientTakerBalance
        );

        let escrow_account_seeds = &[
            b"escrow",
            self.maker.to_account_info().key.as_ref(),
            &self.escrow.id.to_le_bytes()[..],
            &[self.escrow.bump],
        ];
        let signers_seeds = &[&escrow_account_seeds[..]];

        let mint_a_decimals = self.token_mint_a.decimals;
        let mint_b_decimals = self.token_mint_b.decimals;

        // Withdraw offered tokens from the vault to the taker
        let transfer_accounts = TransferChecked {
            mint: self.token_mint_a.to_account_info(),
            from: self.vault.to_account_info(),
            to: self.taker_token_account_a.to_account_info(),
            authority: self.escrow.to_account_info(),
        };

        let transfer_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            transfer_accounts,
            signers_seeds,
        );

        transfer_checked(transfer_ctx, self.vault.amount, mint_a_decimals)?;

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

        // Move expected tokens from the taker to the maker
        let taker_transfer_accounts = TransferChecked {
            mint: self.token_mint_b.to_account_info(),
            from: self.taker_token_account_b.to_account_info(),
            to: self.maker_token_account_b.to_account_info(),
            authority: self.taker.to_account_info(),
        };

        let taker_transfer = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            taker_transfer_accounts,
            signers_seeds,
        );

        transfer_checked(
            taker_transfer,
            self.escrow.token_b_expected_amount,
            mint_b_decimals,
        )?;

        Ok(())
    }
}
