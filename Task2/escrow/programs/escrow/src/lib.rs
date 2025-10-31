#![allow(unexpected_cfgs, deprecated)]
use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("ECma1q2t8NnivKYyE2BJ37A1ydd2QMUQde6GskNsCq7Q");

#[program]
pub mod escrow {
    use super::*;

    pub fn make_offer(
        ctx: Context<MakeOffer>,
        id: u64,
        token_a_offered_amount: u64,
        token_b_expected_amount: u64,
    ) -> Result<()> {
        ctx.accounts._make_offer(
            id,
            token_a_offered_amount,
            token_b_expected_amount,
            &ctx.bumps,
        )
    }

    pub fn take_offer(ctx: Context<TakeOffer>) -> Result<()> {
        ctx.accounts._take_offer()
    }
    pub fn refund_offer(ctx: Context<RefundOffer>) -> Result<()> {
        ctx.accounts._refund_offer()
    }
}
