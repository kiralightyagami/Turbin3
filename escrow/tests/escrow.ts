import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.escrow as Program<Escrow>;
  const maker = provider.wallet as anchor.Wallet;
  
  const taker = anchor.web3.Keypair.generate();

  let mint: anchor.web3.PublicKey;
  let makerTokenAccount: anchor.web3.PublicKey;
  let takerTokenAccount: anchor.web3.PublicKey;
  let escrowState: anchor.web3.PublicKey;
  let escrowTokenAccount: anchor.web3.PublicKey;

  const ESCROW_AMOUNT = new anchor.BN(5_000_000_000); // 5 tokens
  const UNLOCK_TIME_OFFSET = 10; // 10 seconds from now

  before(async () => {
    console.log("Setting up test environment...\n");

    console.log("Airdropping SOL to taker...");
    
    let airdropSuccess = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!airdropSuccess && attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Airdrop attempt ${attempts}...`);
        const airdropSig = await provider.connection.requestAirdrop(
          taker.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(airdropSig);
        
        
        const balance = await provider.connection.getBalance(taker.publicKey);
        if (balance >= 2 * anchor.web3.LAMPORTS_PER_SOL) {
          airdropSuccess = true;
          console.log("Airdropped 2 SOL to taker:", taker.publicKey.toBase58());
        } else {
          console.log(`Airdrop confirmed but balance insufficient. Retrying...`);
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (error) {
        console.log(`Airdrop attempt ${attempts} failed:`, error);
        if (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
    
    if (!airdropSuccess) {
      throw new Error(`Failed to airdrop SOL after ${maxAttempts} attempts`);
    }
    
  
    await new Promise((r) => setTimeout(r, 1000));

    console.log("\nCreating mint...");
    mint = await createMint(
      provider.connection,
      maker.payer,
      maker.publicKey,
      maker.publicKey,
      9 // 9 decimals
    );
    console.log("Mint created:", mint.toBase58());

    // Create maker token account and mint tokens
    console.log("\nCreating maker token account...");
    const makerTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      maker.payer,
      mint,
      maker.publicKey
    );
    makerTokenAccount = makerTokenAccountInfo.address;
    console.log("Maker token account:", makerTokenAccount.toBase58());

    // Create taker token account (use funded payer to cover fees)
    console.log("\nCreating taker token account...");
    const takerTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      maker.payer,
      mint,
      taker.publicKey
    );
    takerTokenAccount = takerTokenAccountInfo.address;
    console.log("Taker token account:", takerTokenAccount.toBase58());

    // Mint tokens to maker
    console.log("\nMinting tokens to maker...");
    await mintTo(
      provider.connection,
      maker.payer,
      mint,
      makerTokenAccount,
      maker.payer,
      20_000_000_000 // 20 tokens
    );
    console.log("Minted 20 tokens to maker");

    // Derive PDAs
    [escrowState] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow_state"),
        maker.publicKey.toBuffer(),
        taker.publicKey.toBuffer(),
        mint.toBuffer(),
      ],
      program.programId
    );
    console.log("\nEscrow State PDA:", escrowState.toBase58());

    [escrowTokenAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_token"), escrowState.toBuffer()],
      program.programId
    );
    console.log("Escrow Token Account PDA:", escrowTokenAccount.toBase58());
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Initialize escrow", async () => {
    console.log("Test 1: Initialize Escrow");

    const currentTime = Math.floor(Date.now() / 1000);
    const unlockTime = new anchor.BN(currentTime + UNLOCK_TIME_OFFSET);

    const makerBalanceBefore = await provider.connection.getTokenAccountBalance(
      makerTokenAccount
    );
    console.log("Maker balance before:", makerBalanceBefore.value.uiAmount);

    const tx = await program.methods
      .initialize(ESCROW_AMOUNT, unlockTime)
      .accounts({
        escrowState,
        escrowTokenAccount,
        makerTokenAccount,
        mint,
        maker: maker.publicKey,
        taker: taker.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // Verify escrow state
    const escrowStateAccount = await program.account.escrowState.fetch(
      escrowState
    );
    assert.equal(
      escrowStateAccount.maker.toBase58(),
      maker.publicKey.toBase58(),
      "Maker mismatch"
    );
    assert.equal(
      escrowStateAccount.taker.toBase58(),
      taker.publicKey.toBase58(),
      "Taker mismatch"
    );
    assert.equal(
      escrowStateAccount.mint.toBase58(),
      mint.toBase58(),
      "Mint mismatch"
    );
    assert.equal(
      escrowStateAccount.amount.toNumber(),
      ESCROW_AMOUNT.toNumber(),
      "Amount mismatch"
    );
    assert.equal(escrowStateAccount.isCompleted, false, "Should not be completed");

    // Verify balances
    const makerBalanceAfter = await provider.connection.getTokenAccountBalance(
      makerTokenAccount
    );
    const escrowBalance = await provider.connection.getTokenAccountBalance(
      escrowTokenAccount
    );

    console.log("Escrow initialized successfully!");
    console.log("Maker:", escrowStateAccount.maker.toBase58());
    console.log("Taker:", escrowStateAccount.taker.toBase58());
    console.log("Amount:", escrowStateAccount.amount.toNumber() / 1e9, "tokens");
    console.log("Unlock time:", new Date(escrowStateAccount.unlockTime.toNumber() * 1000).toISOString());
    console.log("Maker balance after:", makerBalanceAfter.value.uiAmount);
    console.log("Escrow balance:", escrowBalance.value.uiAmount);

    console.log("\nView on Solana Explorer:");
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Wait for unlock time", async () => {
    console.log("Test 2: Waiting for unlock time...");
    console.log(`Waiting ${UNLOCK_TIME_OFFSET + 2} seconds...`);
    
    await new Promise((resolve) => setTimeout(resolve, (UNLOCK_TIME_OFFSET + 2) * 1000));
    
    console.log("Unlock time reached!");
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Complete escrow", async () => {
    console.log("Test 3: Complete Escrow");

    const takerBalanceBefore = await provider.connection.getTokenAccountBalance(
      takerTokenAccount
    );
    console.log("Taker balance before:", takerBalanceBefore.value.uiAmount);

    const tx = await program.methods
      .complete()
      .accounts({
        escrowState,
        escrowTokenAccount,
        takerTokenAccount,
        taker: taker.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .signers([taker])
      .rpc();

    console.log("Transaction signature:", tx);

    // Verify state
    const escrowStateAccount = await program.account.escrowState.fetch(
      escrowState
    );
    assert.equal(
      escrowStateAccount.isCompleted,
      true,
      "Escrow should be completed"
    );

    // Verify balances
    const takerBalanceAfter = await provider.connection.getTokenAccountBalance(
      takerTokenAccount
    );
    const escrowBalance = await provider.connection.getTokenAccountBalance(
      escrowTokenAccount
    );

    console.log("Escrow completed successfully!");
    console.log("Taker balance after:", takerBalanceAfter.value.uiAmount);
    console.log("Escrow balance:", escrowBalance.value.uiAmount);
    console.log("Is completed:", escrowStateAccount.isCompleted);

    assert.equal(
      takerBalanceAfter.value.amount,
      ESCROW_AMOUNT.toString(),
      "Taker should receive escrow amount"
    );
    assert.equal(
      escrowBalance.value.amount,
      "0",
      "Escrow should be empty"
    );

    console.log("\nView on Solana Explorer:");
    console.log(`   https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Test cancellation flow (separate escrow)", async () => {
    console.log("Test 4: Cancel Escrow");

    // Create a new escrow for cancellation test
    const taker2 = anchor.web3.Keypair.generate();
    
    const [escrowState2] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow_state"),
        maker.publicKey.toBuffer(),
        taker2.publicKey.toBuffer(),
        mint.toBuffer(),
      ],
      program.programId
    );

    const [escrowTokenAccount2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_token"), escrowState2.toBuffer()],
      program.programId
    );

    // Initialize new escrow with future unlock time
    const currentTime = Math.floor(Date.now() / 1000);
    const unlockTime = new anchor.BN(currentTime + 300); // 5 minutes from now

    console.log("\nInitializing new escrow for cancellation test...");
    const initTx = await program.methods
      .initialize(ESCROW_AMOUNT, unlockTime)
      .accounts({
        escrowState: escrowState2,
        escrowTokenAccount: escrowTokenAccount2,
        makerTokenAccount,
        mint,
        maker: maker.publicKey,
        taker: taker2.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    console.log("New escrow initialized:", initTx);

    // Cancel the escrow
    const makerBalanceBefore = await provider.connection.getTokenAccountBalance(
      makerTokenAccount
    );
    console.log("\nMaker balance before cancel:", makerBalanceBefore.value.uiAmount);

    const cancelTx = await program.methods
      .cancel()
      .accounts({
        escrowState: escrowState2,
        escrowTokenAccount: escrowTokenAccount2,
        makerTokenAccount,
        maker: maker.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Cancellation transaction signature:", cancelTx);

    const makerBalanceAfter = await provider.connection.getTokenAccountBalance(
      makerTokenAccount
    );
    console.log("Maker balance after cancel:", makerBalanceAfter.value.uiAmount);

    console.log("Escrow cancelled successfully!");
    console.log("   Tokens returned to maker");

    console.log("\nView on Solana Explorer:");
    console.log(`https://explorer.solana.com/tx/${cancelTx}?cluster=devnet`);
    console.log("\n" + "=".repeat(60) + "\n");
  });
});
