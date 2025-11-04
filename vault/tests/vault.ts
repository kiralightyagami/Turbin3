import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.vault as Program<Vault>;
  const wallet = provider.wallet as anchor.Wallet;

  let mint: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let vaultState: anchor.web3.PublicKey;
  let vaultTokenAccount: anchor.web3.PublicKey;

  const DEPOSIT_AMOUNT = new anchor.BN(1_000_000_000); // 1 token
  const WITHDRAW_AMOUNT = new anchor.BN(500_000_000); // 0.5 token

  before(async () => {
    console.log("Setting up test environment...\n");

    console.log("Creating mint...");
    mint = await createMint(
      provider.connection,
      wallet.payer,
      wallet.publicKey,
      wallet.publicKey,
      9 // 9 decimals
    );
    console.log("Mint created:", mint.toBase58());

    // Create user token account and mint tokens
    console.log("\nCreating user token account...");
    const userTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      wallet.payer,
      mint,
      wallet.publicKey
    );
    userTokenAccount = userTokenAccountInfo.address;
    console.log("User token account:", userTokenAccount.toBase58());

    // Mint tokens to user
    console.log("\nMinting tokens to user...");
    await mintTo(
      provider.connection,
      wallet.payer,
      mint,
      userTokenAccount,
      wallet.payer,
      10_000_000_000 // 10 tokens
    );
    console.log("Minted 10 tokens to user");

    // Derive PDAs
    [vaultState] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault_state"),
        wallet.publicKey.toBuffer(),
        mint.toBuffer(),
      ],
      program.programId
    );
    console.log("\nVault State PDA:", vaultState.toBase58());

    [vaultTokenAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault_token"), vaultState.toBuffer()],
      program.programId
    );
    console.log("Vault Token Account PDA:", vaultTokenAccount.toBase58());
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Initialize vault", async () => {
    console.log("Initialize Vault");

    const tx = await program.methods
      .initialize()
      .accounts({
        vaultState,
        vaultTokenAccount,
        mint,
        owner: wallet.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // Verify vault state
    const vaultStateAccount = await program.account.vaultState.fetch(vaultState);
    assert.equal(
      vaultStateAccount.owner.toBase58(),
      wallet.publicKey.toBase58(),
      "Owner mismatch"
    );
    assert.equal(
      vaultStateAccount.mint.toBase58(),
      mint.toBase58(),
      "Mint mismatch"
    );
    assert.equal(
      vaultStateAccount.totalLocked.toNumber(),
      0,
      "Initial locked amount should be 0"
    );

    console.log("Vault initialized successfully!");
    console.log("Owner:", vaultStateAccount.owner.toBase58());
    console.log("Mint:", vaultStateAccount.mint.toBase58());
    console.log("Total Locked:", vaultStateAccount.totalLocked.toNumber());
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Deposit tokens into vault", async () => {
    console.log("Deposit Tokens");

    const userBalanceBefore = await provider.connection.getTokenAccountBalance(
      userTokenAccount
    );
    console.log("User balance before:", userBalanceBefore.value.uiAmount);

    const tx = await program.methods
      .deposit(DEPOSIT_AMOUNT)
      .accounts({
        vaultState,
        vaultTokenAccount,
        userTokenAccount,
        mint,
        owner: wallet.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // Verify balances
    const userBalanceAfter = await provider.connection.getTokenAccountBalance(
      userTokenAccount
    );
    const vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultTokenAccount
    );
    const vaultStateAccount = await program.account.vaultState.fetch(vaultState);

    console.log("Deposit successful!");
    console.log("User balance after:", userBalanceAfter.value.uiAmount);
    console.log("Vault balance:", vaultBalance.value.uiAmount);
    console.log("Total locked:", vaultStateAccount.totalLocked.toNumber() / 1e9);

    assert.equal(
      vaultBalance.value.amount,
      DEPOSIT_AMOUNT.toString(),
      "Vault balance mismatch"
    );
    assert.equal(
      vaultStateAccount.totalLocked.toNumber(),
      DEPOSIT_AMOUNT.toNumber(),
      "Total locked mismatch"
    );

    console.log("\nView on Solana Explorer:");
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Withdraw tokens from vault", async () => {
    console.log("Withdraw Tokens");

    const userBalanceBefore = await provider.connection.getTokenAccountBalance(
      userTokenAccount
    );
    console.log("User balance before:", userBalanceBefore.value.uiAmount);

    const tx = await program.methods
      .withdraw(WITHDRAW_AMOUNT)
      .accounts({
        vaultState,
        vaultTokenAccount,
        userTokenAccount,
        mint,
        owner: wallet.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // Verify balances
    const userBalanceAfter = await provider.connection.getTokenAccountBalance(
      userTokenAccount
    );
    const vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultTokenAccount
    );
    const vaultStateAccount = await program.account.vaultState.fetch(vaultState);

    console.log("Withdrawal successful!");
    console.log("User balance after:", userBalanceAfter.value.uiAmount);
    console.log("Vault balance:", vaultBalance.value.uiAmount);
    console.log("Total locked:", vaultStateAccount.totalLocked.toNumber() / 1e9);

    const expectedLocked = DEPOSIT_AMOUNT.sub(WITHDRAW_AMOUNT);
    assert.equal(
      vaultStateAccount.totalLocked.toNumber(),
      expectedLocked.toNumber(),
      "Total locked mismatch after withdrawal"
    );

    console.log("\nView on Solana Explorer:");
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Withdraw remaining tokens", async () => {
    console.log("Withdraw Remaining Tokens");

    const vaultStateAccount = await program.account.vaultState.fetch(vaultState);
    const remainingAmount = vaultStateAccount.totalLocked;

    const tx = await program.methods
      .withdraw(remainingAmount)
      .accounts({
        vaultState,
        vaultTokenAccount,
        userTokenAccount,
        mint,
        owner: wallet.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // Verify vault is empty
    const vaultStateAfter = await program.account.vaultState.fetch(vaultState);
    const vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultTokenAccount
    );

    console.log("All tokens withdrawn!");
    console.log("Vault balance:", vaultBalance.value.uiAmount);
    console.log("Total locked:", vaultStateAfter.totalLocked.toNumber());

    assert.equal(
      vaultStateAfter.totalLocked.toNumber(),
      0,
      "Vault should be empty"
    );

    console.log("\n" + "=".repeat(60) + "\n");
  });
});
