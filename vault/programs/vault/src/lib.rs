use anchor_lang::prelude::*;

declare_id!("6dMhvcSPNuvTBvrJpkuTjg72t9JzLRE2GzaczCWRGwm4");

#[program]
pub mod vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
