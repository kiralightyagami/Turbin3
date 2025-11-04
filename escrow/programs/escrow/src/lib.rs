use anchor_lang::prelude::*;

declare_id!("AUx1K3FxHyWtZVpBtTjSL14L5uqRTVjnNxtxZi6BrV1F");

#[program]
pub mod escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
