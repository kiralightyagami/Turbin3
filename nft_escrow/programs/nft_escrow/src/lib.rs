#![allow(unexpected_cfgs, deprecated)]
use anchor_lang::prelude::*;

declare_id!("DExKq85qoTWHE4GZ81NYtpnSKSQMrXw1HnKXEAbmQyHN");

pub mod constants;
pub mod error;
pub mod state;
pub mod instructions;

use instructions::*;

#[program]
pub mod nft_escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::initialize(ctx)
    }

    pub fn accept(ctx: Context<Accept>) -> Result<()> {
        instructions::accept::accept(ctx)
    }

    pub fn complete(ctx: Context<Complete>) -> Result<()> {
        instructions::complete::complete(ctx)
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        instructions::cancel::cancel(ctx)
    }
}
