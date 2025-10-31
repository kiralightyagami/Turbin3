import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ThemisEscrow } from "../target/types/escrow";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";
import { requestAirdrop } from "./utilities";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ThemisEscrow as Program<ThemisEscrow>;

  const maker = anchor.web3.Keypair.generate();
  const taker = anchor.web3.Keypair.generate();
  const depositAmount = 1_000_000_000;
  const receiveAmount = 2_000_000_000;
  const tokenAMintAmount = 4_000_000_000;
  const tokenBMintAmount = 8_000_000_000;

  let tokenMintA: anchor.web3.PublicKey;
  let tokenMintB: anchor.web3.PublicKey;
  let makerAtaA: anchor.web3.PublicKey;
  let makerAtaB: anchor.web3.PublicKey;
  let takerAtaA: anchor.web3.PublicKey;
  let takerAtaB: anchor.web3.PublicKey;

  before(async () => {
    await requestAirdrop(provider.connection, maker.publicKey);
    await requestAirdrop(provider.connection, taker.publicKey);

    tokenMintA = await createMint(
      provider.connection,
      maker,
      maker.publicKey,
      null,
      6
    );

    tokenMintB = await createMint(
      provider.connection,
      taker,
      taker.publicKey,
      null,
      6
    );

    // Setup maker's token accounts
    const makerAtaAAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      maker,
      tokenMintA,
      maker.publicKey
    );
    makerAtaA = makerAtaAAccount.address;

    await mintTo(
      provider.connection,
      maker,
      tokenMintA,
      makerAtaA,
      maker,
      tokenAMintAmount
    );

    // Setup taker's token accounts
    const takerAtaBAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      taker,
      tokenMintB,
      taker.publicKey
    );
    takerAtaB = takerAtaBAccount.address;

    await mintTo(
      provider.connection,
      taker,
      tokenMintB,
      takerAtaB,
      taker,
      tokenBMintAmount
    );

    makerAtaB = getAssociatedTokenAddressSync(tokenMintB, maker.publicKey);
    takerAtaA = getAssociatedTokenAddressSync(tokenMintA, taker.publicKey);
  });

  it("should make and refund the escrow", async () => {
    const id = new anchor.BN(1111);

    const [escrowPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        id.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const vault = getAssociatedTokenAddressSync(tokenMintA, escrowPda, true);

    // Make offer
    await program.methods
      .makeOffer(id, new anchor.BN(depositAmount), new anchor.BN(receiveAmount))
      .accountsStrict({
        maker: maker.publicKey,
        tokenMintA,
        tokenMintB,
        makerTokenAccountA: makerAtaA,
        escrow: escrowPda,
        vault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([maker])
      .rpc();

    const escrowAccount = await program.account.escrow.fetch(escrowPda);
    expect(escrowAccount.maker.toBase58()).to.equal(maker.publicKey.toBase58());
    expect(escrowAccount.tokenMintA.toBase58()).to.equal(tokenMintA.toBase58());
    expect(escrowAccount.tokenMintB.toBase58()).to.equal(tokenMintB.toBase58());
    expect(escrowAccount.tokenBExpectedAmount.toNumber()).to.equal(
      receiveAmount
    );

    const vaultBalance = (
      await provider.connection.getTokenAccountBalance(vault)
    ).value.amount;
    expect(vaultBalance).to.equal(depositAmount.toString());

    // Refund offer
    await program.methods
      .refundOffer()
      .accountsStrict({
        maker: maker.publicKey,
        tokenMintA,
        makerTokenAccountA: makerAtaA,
        escrow: escrowPda,
        vault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([maker])
      .rpc();

    // Verify accounts are closed
    const escrowInfo = await provider.connection.getAccountInfo(escrowPda);
    expect(escrowInfo).to.be.null;

    const vaultInfo = await provider.connection.getAccountInfo(vault);
    expect(vaultInfo).to.be.null;
  });

  it("should make and take the escrow", async () => {
    const id = new anchor.BN(2222);

    const [escrowPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.publicKey.toBuffer(),
        id.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const vault = getAssociatedTokenAddressSync(tokenMintA, escrowPda, true);

    // Make offer
    await program.methods
      .makeOffer(id, new anchor.BN(depositAmount), new anchor.BN(receiveAmount))
      .accountsStrict({
        maker: maker.publicKey,
        tokenMintA,
        tokenMintB,
        makerTokenAccountA: makerAtaA,
        escrow: escrowPda,
        vault,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([maker])
      .rpc();

    // Take offer
    await program.methods
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

    // Verify accounts are closed
    const escrowInfo = await provider.connection.getAccountInfo(escrowPda);
    expect(escrowInfo).to.be.null;

    const vaultInfo = await provider.connection.getAccountInfo(vault);
    expect(vaultInfo).to.be.null;

    // Verify final balances
    const takerBalanceA = (
      await provider.connection.getTokenAccountBalance(takerAtaA)
    ).value.amount;
    expect(takerBalanceA).to.equal(depositAmount.toString());

    const makerBalanceB = (
      await provider.connection.getTokenAccountBalance(makerAtaB)
    ).value.amount;
    expect(makerBalanceB).to.equal(receiveAmount.toString());
  });
});
