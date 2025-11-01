#![allow(unexpected_cfgs, deprecated)]

use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;

use instructions::*;

declare_id!("9w6uJyaL3nNkMqC1pWCb8yCiSLFnG6qqLSgEhqa3Htm7");

#[program]
pub mod vault {

    use super::*;

    pub fn initialize(ctx: Context<InitializeVault>, target_amount: u64) -> Result<()> {
        let mint_pubkey = ctx.accounts.mint.key();
        ctx.accounts
            ._init_vault(target_amount, mint_pubkey, ctx.bumps)?;
        Ok(())
    }

    pub fn deposit(ctx: Context<VaultOperations>, amount: u64) -> Result<()> {
        ctx.accounts._deposit(amount)?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<VaultOperations>) -> Result<()> {
        ctx.accounts._withdraw()?;
        Ok(())
    }
}
