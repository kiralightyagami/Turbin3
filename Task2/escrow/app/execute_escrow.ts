import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";
import {
  commitment,
  endpoint,
  getOrCreateMintAuthority,
  mintAddress,
  requestAirdrop,
  wrapSOL,
} from "./utilities";
import { mintTokens } from "./mint_tokens";
import idl from "../target/idl/themis_escrow.json";
import { ThemisEscrow } from "../target/types/themis_escrow";

const connection: Connection = new Connection(endpoint, commitment);
const escrowInterface = JSON.parse(JSON.stringify(idl));
const tokenMintA = new PublicKey(mintAddress);

async function executeEscrow() {
  try {
    // Setup maker and taker keypairs
    const maker = getOrCreateMintAuthority();
    const taker = Keypair.generate();

    console.log("Maker:", maker.publicKey.toBase58());
    console.log("Taker:", taker.publicKey.toBase58());

    // Airdrop SOL
    await requestAirdrop(connection, maker);
    await requestAirdrop(connection, taker);

    console.log("\n> Using Devwraithe DRT as Token A:", tokenMintA.toBase58());
    console.log("> Using Wrapped SOL as Token B:", NATIVE_MINT.toBase58());

    const tokenMintB = NATIVE_MINT; // Wrapped SOL (wSOL)

    const provider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(maker),
      { preflightCommitment: commitment }
    );

    const program = new anchor.Program(
      escrowInterface,
      provider
    ) as anchor.Program<ThemisEscrow>;

    // Create maker's DRT (Token A) account
    console.log("\n> Setting up token accounts...");
    const makerAtaA = await getOrCreateAssociatedTokenAccount(
      connection,
      maker,
      tokenMintA,
      maker.publicKey
    );
    console.log("Maker ATA A (DRT):", makerAtaA.address.toBase58());

    // Mint tokens
    const depositAmount = 1_000_000_000; // 1000 DRT tokens
    const receiveAmount = 500_000_000; // 0.5 wSOL

    console.log("\n> Minting DRT to maker...");
    await mintTokens(tokenMintA, maker.publicKey, depositAmount * 2);

    // Wrap SOL for taker using the wrapSOL function
    const wrapAmount = receiveAmount * 2;
    const takerAtaB = await wrapSOL(connection, taker, wrapAmount);

    const escrowId = new anchor.BN(Date.now());
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        escrowId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const vault = getAssociatedTokenAddressSync(tokenMintA, escrowPda, true);

    console.log("\n> Escrow PDA:", escrowPda.toBase58());
    console.log("> Vault:", vault.toBase58());

    const makerAtaB = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      maker.publicKey
    );

    const takerAtaA = getAssociatedTokenAddressSync(
      tokenMintA,
      taker.publicKey
    );

    // Make offer
    console.log("\n> Making escrow offer...");
    const makeOfferTxn = await program.methods
      .makeOffer(
        escrowId,
        new anchor.BN(depositAmount),
        new anchor.BN(receiveAmount)
      )
      .accountsStrict({
        maker: maker.publicKey,
        tokenMintA,
        tokenMintB,
        makerTokenAccountA: makerAtaA.address,
        escrow: escrowPda,
        vault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([maker])
      .rpc();

    console.log("Make Offer Txn:", makeOfferTxn);

    // Fetch and display escrow state
    const escrowAccount = await program.account.escrow.fetch(escrowPda);
    console.log("> Maker:", escrowAccount.maker.toBase58());
    console.log("> Token A (DRT):", escrowAccount.tokenMintA.toBase58());
    console.log("> Token B (wSOL):", escrowAccount.tokenMintB.toBase58());
    console.log(
      "> Expected Amount B:",
      escrowAccount.tokenBExpectedAmount.toString()
    );

    // Take offer
    console.log("\n> Taking escrow offer...");
    const takeOfferTxn = await program.methods
      .takeOffer()
      .accountsStrict({
        taker: taker.publicKey,
        maker: maker.publicKey,
        tokenMintA,
        tokenMintB,
        takerTokenAccountA: takerAtaA,
        takerTokenAccountB: takerAtaB,
        makerTokenAccountB: makerAtaB,
        escrow: escrowPda,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([taker])
      .rpc();

    console.log("Take Offer Txn:", takeOfferTxn);

    // Verify balances
    console.log("\n> Verifying final balances...");
    const takerBalanceA = await connection.getTokenAccountBalance(takerAtaA);
    console.log("> Taker DRT Balance:", takerBalanceA.value.uiAmount);

    const makerBalanceB = await connection.getTokenAccountBalance(makerAtaB);
    console.log("> Maker wSOL Balance:", makerBalanceB.value.uiAmount, "SOL");

    console.log("> Escrow execution completed successfully!");
  } catch (e) {
    console.error("> Error executing escrow:", e);
    throw e;
  }
}

// Call execute escrow
executeEscrow();
