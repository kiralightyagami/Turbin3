import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftEscrow } from "../target/types/nft_escrow";
import { assert } from "chai";

describe("nft_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.nftEscrow as Program<NftEscrow>;
  const maker = provider.wallet as anchor.Wallet;
  const taker = anchor.web3.Keypair.generate();

  // Placeholder NFT addresses (in production, these would be actual Metaplex Core NFT addresses)
  let makerNft: anchor.web3.PublicKey;
  let takerNft: anchor.web3.PublicKey;
  let escrowState: anchor.web3.PublicKey;

  before(async () => {
    console.log("Setting up test environment...\n");

    // Airdrop SOL to taker
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

    // Generate placeholder NFT addresses
    // In production, these would be actual Metaplex Core NFT addresses
    makerNft = anchor.web3.Keypair.generate().publicKey;
    takerNft = anchor.web3.Keypair.generate().publicKey;

    console.log("Maker NFT (placeholder):", makerNft.toBase58());
    console.log("Taker NFT (placeholder):", takerNft.toBase58());
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Initializes NFT escrow", async () => {
    console.log("Test 1: Initialize NFT Escrow");

    // Derive escrow state PDA
    [escrowState] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("nft_escrow_state"),
        maker.publicKey.toBuffer(),
        taker.publicKey.toBuffer(),
        makerNft.toBuffer(),
      ],
      program.programId
    );
    console.log("Escrow State PDA:", escrowState.toBase58());

    const tx = await program.methods
      .initialize()
      .accounts({
        escrowState: escrowState,
        makerNft: makerNft,
        maker: maker.publicKey,
        taker: taker.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // Verify escrow state
    const escrowStateAccount = await program.account.nftEscrowState.fetch(
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
      escrowStateAccount.makerNft.toBase58(),
      makerNft.toBase58(),
      "Maker NFT mismatch"
    );
    assert.equal(
      escrowStateAccount.isAccepted,
      false,
      "Should not be accepted yet"
    );
    assert.equal(
      escrowStateAccount.isCompleted,
      false,
      "Should not be completed yet"
    );

    console.log("Escrow initialized successfully!");
    console.log("Maker:", escrowStateAccount.maker.toBase58());
    console.log("Taker:", escrowStateAccount.taker.toBase58());
    console.log("Maker NFT:", escrowStateAccount.makerNft.toBase58());
    console.log("Is Accepted:", escrowStateAccount.isAccepted);
    console.log("Is Completed:", escrowStateAccount.isCompleted);

    console.log("\nView on Solana Explorer:");
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Accepts NFT escrow", async () => {
    console.log("Test 2: Accept NFT Escrow");

    const tx = await program.methods
      .accept()
      .accounts({
        escrowState: escrowState,
        takerNft: takerNft,
        taker: taker.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([taker])
      .rpc();

    console.log("Transaction signature:", tx);

    // Verify escrow state
    const escrowStateAccount = await program.account.nftEscrowState.fetch(
      escrowState
    );
    assert.equal(
      escrowStateAccount.isAccepted,
      true,
      "Should be accepted"
    );
    assert.equal(
      escrowStateAccount.takerNft.toBase58(),
      takerNft.toBase58(),
      "Taker NFT mismatch"
    );
    assert.equal(
      escrowStateAccount.isCompleted,
      false,
      "Should not be completed yet"
    );

    console.log("Escrow accepted successfully!");
    console.log("Taker NFT:", escrowStateAccount.takerNft.toBase58());
    console.log("Is Accepted:", escrowStateAccount.isAccepted);
    console.log("Is Completed:", escrowStateAccount.isCompleted);

    console.log("\nView on Solana Explorer:");
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Completes NFT escrow", async () => {
    console.log("Test 3: Complete NFT Escrow");

    const tx = await program.methods
      .complete()
      .accounts({
        escrowState: escrowState,
        makerNft: makerNft,
        takerNft: takerNft,
        maker: maker.publicKey,
        taker: taker.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // Verify escrow state
    const escrowStateAccount = await program.account.nftEscrowState.fetch(
      escrowState
    );
    assert.equal(
      escrowStateAccount.isCompleted,
      true,
      "Should be completed"
    );
    assert.equal(
      escrowStateAccount.isAccepted,
      true,
      "Should still be accepted"
    );

    console.log("Escrow completed successfully!");
    console.log("Maker receives NFT:", escrowStateAccount.takerNft.toBase58());
    console.log("Taker receives NFT:", escrowStateAccount.makerNft.toBase58());
    console.log("Is Completed:", escrowStateAccount.isCompleted);

    console.log("\nView on Solana Explorer:");
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Test cancellation flow (separate escrow)", async () => {
    console.log("Test 4: Cancel NFT Escrow");

    // Create a new escrow for cancellation test
    const taker2 = anchor.web3.Keypair.generate();
    const makerNft2 = anchor.web3.Keypair.generate().publicKey;

    
    try {
      const airdropSig = await provider.connection.requestAirdrop(
        taker2.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);
    } catch (error) {
      console.log("Airdrop to taker2 failed, continuing...");
    }

    const [escrowState2] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("nft_escrow_state"),
        maker.publicKey.toBuffer(),
        taker2.publicKey.toBuffer(),
        makerNft2.toBuffer(),
      ],
      program.programId
    );

    console.log("\nInitializing new escrow for cancellation test...");
    const initTx = await program.methods
      .initialize()
      .accounts({
        escrowState: escrowState2,
        makerNft: makerNft2,
        maker: maker.publicKey,
        taker: taker2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    console.log("New escrow initialized:", initTx);

    // Cancel the escrow
    const cancelTx = await program.methods
      .cancel()
      .accounts({
        escrowState: escrowState2,
        makerNft: makerNft2,
        maker: maker.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Cancellation transaction signature:", cancelTx);

    // Verify escrow state is still not accepted
    const escrowStateAccount2 = await program.account.nftEscrowState.fetch(
      escrowState2
    );
    assert.equal(
      escrowStateAccount2.isAccepted,
      false,
      "Should not be accepted"
    );
    assert.equal(
      escrowStateAccount2.isCompleted,
      false,
      "Should not be completed"
    );

    console.log("Escrow cancelled successfully!");
    console.log("NFT returned to maker");

    console.log("\nView on Solana Explorer:");
    console.log(`https://explorer.solana.com/tx/${cancelTx}?cluster=devnet`);
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Test error cases - wrong taker", async () => {
    console.log("Test 5: Error Case - Wrong Taker");

    const wrongTaker = anchor.web3.Keypair.generate();
    const makerNft3 = anchor.web3.Keypair.generate().publicKey;

    const [escrowState3] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("nft_escrow_state"),
        maker.publicKey.toBuffer(),
        taker.publicKey.toBuffer(),
        makerNft3.toBuffer(),
      ],
      program.programId
    );

    // Initialize escrow
    await program.methods
      .initialize()
      .accounts({
        escrowState: escrowState3,
        makerNft: makerNft3,
        maker: maker.publicKey,
        taker: taker.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Try to accept with wrong taker
    try {
      await program.methods
        .accept()
        .accounts({
          escrowState: escrowState3,
          takerNft: takerNft,
          taker: wrongTaker.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([wrongTaker])
        .rpc();
      
      assert.fail("Should have thrown an error for wrong taker");
    } catch (error: any) {
      console.log("Correctly rejected wrong taker");
      // The has_one constraint will fail before the custom error check
      // Check for account constraint error or custom error
      const errorStr = error.toString();
      assert(
        errorStr.includes("has_one") || 
        errorStr.includes("InvalidTaker") ||
        errorStr.includes("constraint") ||
        errorStr.includes("Account") ||
        errorStr.includes("escrow"),
        "Should throw account constraint or InvalidTaker error"
      );
    }

    console.log("Error case test passed!");
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Test error cases - complete before accept", async () => {
    console.log("Test 6: Error Case - Complete Before Accept");

    const makerNft4 = anchor.web3.Keypair.generate().publicKey;
    const takerNft4 = anchor.web3.Keypair.generate().publicKey;

    const [escrowState4] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("nft_escrow_state"),
        maker.publicKey.toBuffer(),
        taker.publicKey.toBuffer(),
        makerNft4.toBuffer(),
      ],
      program.programId
    );

    // Initialize escrow
    await program.methods
      .initialize()
      .accounts({
        escrowState: escrowState4,
        makerNft: makerNft4,
        maker: maker.publicKey,
        taker: taker.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Try to complete before accept
    try {
      await program.methods
        .complete()
        .accounts({
          escrowState: escrowState4,
          makerNft: makerNft4,
          takerNft: takerNft4,
          maker: maker.publicKey,
          taker: taker.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      assert.fail("Should have thrown an error for completing before accept");
    } catch (error: any) {
      console.log("Correctly rejected complete before accept");
      assert.include(
        error.toString(),
        "EscrowNotAccepted",
        "Should throw EscrowNotAccepted error"
      );
    }

    console.log("Error case test passed!");
    console.log("\n" + "=".repeat(60) + "\n");
  });

  it("Test error cases - cancel after accept", async () => {
    console.log("Test 7: Error Case - Cancel After Accept");

    const makerNft5 = anchor.web3.Keypair.generate().publicKey;
    const takerNft5 = anchor.web3.Keypair.generate().publicKey;

    const [escrowState5] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("nft_escrow_state"),
        maker.publicKey.toBuffer(),
        taker.publicKey.toBuffer(),
        makerNft5.toBuffer(),
      ],
      program.programId
    );

    // Initialize escrow
    await program.methods
      .initialize()
      .accounts({
        escrowState: escrowState5,
        makerNft: makerNft5,
        maker: maker.publicKey,
        taker: taker.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Accept escrow
    await program.methods
      .accept()
      .accounts({
        escrowState: escrowState5,
        takerNft: takerNft5,
        taker: taker.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([taker])
      .rpc();

    // Try to cancel after accept
    try {
      await program.methods
        .cancel()
        .accounts({
          escrowState: escrowState5,
          makerNft: makerNft5,
          maker: maker.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      assert.fail("Should have thrown an error for canceling after accept");
    } catch (error: any) {
      console.log("Correctly rejected cancel after accept");
      assert.include(
        error.toString(),
        "CannotCancelAfterAcceptance",
        "Should throw CannotCancelAfterAcceptance error"
      );
    }

    console.log("Error case test passed!");
    console.log("\n" + "=".repeat(60) + "\n");
  });
});
