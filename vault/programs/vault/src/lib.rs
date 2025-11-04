#![allow(unexpected_cfgs, deprecated)]
use anchor_lang::prelude::*;

declare_id!("6dMhvcSPNuvTBvrJpkuTjg72t9JzLRE2GzaczCWRGwm4");

pub mod constants;
pub mod error;
pub mod state;
pub mod instructions;

use instructions::*;

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::initialize(ctx)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::deposit(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::withdraw(ctx, amount)
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        instructions::close::close(ctx)
    }
}
