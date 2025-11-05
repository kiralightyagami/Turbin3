#![allow(unexpected_cfgs, deprecated)]
use anchor_lang::prelude::*;

declare_id!("AUx1K3FxHyWtZVpBtTjSL14L5uqRTVjnNxtxZi6BrV1F");

pub mod constants;
pub mod error;
pub mod state;
pub mod instructions;

use instructions::*;

#[program]
pub mod escrow {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        amount: u64,
        unlock_time: i64,
    ) -> Result<()> {
        instructions::initialize::initialize(ctx, amount, unlock_time)
    }

    pub fn complete(ctx: Context<Complete>) -> Result<()> {
        instructions::complete::complete(ctx)
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        instructions::cancel::cancel(ctx)
    }

    pub fn close_escrow(ctx: Context<CloseEscrow>) -> Result<()> {
        instructions::close_escrow::close_escrow(ctx)
    }
}
