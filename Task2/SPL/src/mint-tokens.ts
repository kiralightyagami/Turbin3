import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import {
  commitment,
  endpoint,
  filePath,
  loadKeypairFromFile,
} from "./utilities";
import promptSync from "prompt-sync";

const connection: Connection = new Connection(endpoint, commitment);

async function mintTokens() {
  try {
    const mintAmount = 150_000_000_000;
    const prompt = promptSync();

    const mintAuthority = loadKeypairFromFile(filePath);

    const mintAddress: string = prompt("Enter mint address: ");
    const mintPubkey = new PublicKey(mintAddress);

    const walletAddress: string = prompt("Enter wallet (mint owner) address: ");
    const walletPubkey = new PublicKey(walletAddress);

    const aTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection, // connection
      mintAuthority, // payer
      mintPubkey, // mint
      walletPubkey // owner
    );

    const txn = await mintTo(
      connection,
      mintAuthority,
      mintPubkey,
      aTokenAccount.address,
      mintAuthority.publicKey,
      mintAmount
    );

    console.log(`Minted ${mintAmount} tokens to ${aTokenAccount.address}`);
    console.log("Txn Signature:", txn);
  } catch (e) {
    console.log("Error minting tokens to token account:", e);
    throw e;
  }
}

// Call mintTokens function
mintTokens();
