import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { TOKEN_CONFIG } from "./config";
import { TokenAccounts } from "./types";

export async function createMintAccount(
  connection: Connection,
  wallet: Keypair
): Promise<{ mintKeypair: Keypair; associatedTokenAddress: PublicKey; signature: string }> {
  const mintKeypair = Keypair.generate();
  console.log("Mint Address:", mintKeypair.publicKey.toBase58());

  const lamports = await getMinimumBalanceForRentExemptMint(connection);

  const associatedTokenAddress = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    wallet.publicKey
  );

  console.log("Associated Token Account:", associatedTokenAddress.toBase58(), "\n");

  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      TOKEN_CONFIG.decimals,
      wallet.publicKey,
      wallet.publicKey,
      TOKEN_PROGRAM_ID
    ),
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      associatedTokenAddress,
      wallet.publicKey,
      mintKeypair.publicKey
    )
  );

  console.log("Creating mint account and associated token account...");
  const signature = await sendAndConfirmTransaction(connection, transaction, [
    wallet,
    mintKeypair,
  ]);
  console.log("Mint created! Signature:", signature, "\n");

  return { mintKeypair, associatedTokenAddress, signature };
}

export async function mintTokens(
  connection: Connection,
  wallet: Keypair,
  mintKeypair: Keypair,
  associatedTokenAddress: PublicKey
): Promise<string> {
  const mintAmount = TOKEN_CONFIG.initialSupply * Math.pow(10, TOKEN_CONFIG.decimals);
  const mintInstruction = createMintToInstruction(
    mintKeypair.publicKey,
    associatedTokenAddress,
    wallet.publicKey,
    mintAmount
  );

  const mintTransaction = new Transaction().add(mintInstruction);

  console.log("Minting", TOKEN_CONFIG.initialSupply, "tokens...");
  const signature = await sendAndConfirmTransaction(connection, mintTransaction, [wallet]);
  console.log("Tokens minted! Signature:", signature, "\n");

  return signature;
}

