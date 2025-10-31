import {
  clusterApiUrl,
  Commitment,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import {
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  createSyncNativeInstruction,
  getOrCreateAssociatedTokenAccount,
  NATIVE_MINT,
} from "@solana/spl-token";

export const mintAuthFilePath = "./mint_authority.json";
export const userFilePath = "./user_keypair.json";
export const endpoint: string = clusterApiUrl("devnet");
export const commitment: Commitment = "confirmed";
export const mintAddress = "Fdw8FEek786AZhg4PSSm7nsgHCCu3MsorVhXgMeWZY9a";

export function getOrCreateMintAuthority(): Keypair {
  if (fs.existsSync(userFilePath)) {
    return loadKeypairFromFile(userFilePath);
  } else {
    const keypair = Keypair.generate();
    fs.writeFileSync(
      userFilePath,
      JSON.stringify(Array.from(keypair.secretKey))
    );
    console.log("Created new mint authority at:", userFilePath);
    return keypair;
  }
}

export function loadKeypairFromFile(secretFilePath: string) {
  const secret = JSON.parse(fs.readFileSync(secretFilePath, "utf-8"));
  const secretKey = Uint8Array.from(secret);
  return Keypair.fromSecretKey(secretKey);
}

export async function requestAirdrop(connection: Connection, keypair: Keypair) {
  const balance = await checkBalance(connection, keypair);
  if (balance < 1.0) {
    console.log("> You do not have enough funds. Requesting airdrop...");
    try {
      const txn = await connection.requestAirdrop(
        keypair.publicKey,
        1 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(txn, "confirmed");
      console.log(`Airdrop to ${keypair.publicKey} is successful`);
    } catch (e) {
      console.log("Airdrop request failed:", e);
      console.log("Using manual transfer contingency...");
      transferSol(connection, keypair.publicKey, 2);
    }
  } else {
    console.log("> You have enough funds to continue");
  }
}

export async function checkBalance(
  connection: Connection,
  keypair: Keypair
): Promise<number> {
  const lamportsBalance = await connection.getBalance(keypair.publicKey);
  const solBalance = lamportsBalance / LAMPORTS_PER_SOL;
  console.log(solBalance);
  return solBalance;
}

export async function wrapSOL(
  connection: Connection,
  user: Keypair,
  amount: number
): Promise<PublicKey> {
  try {
    console.log(`\n> Wrapping ${amount} lamports as wSOL...`);

    // Create or get the user's wSOL ATA
    const wsolAta = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      NATIVE_MINT,
      user.publicKey
    );

    console.log("wSOL ATA:", wsolAta.address.toBase58());

    // Create transaction to transfer SOL and sync
    const wrapTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: user.publicKey,
        toPubkey: wsolAta.address,
        lamports: amount,
      }),
      createSyncNativeInstruction(wsolAta.address)
    );

    const signature = await sendAndConfirmTransaction(connection, wrapTx, [
      user,
    ]);

    console.log(`> Wrapped ${amount} lamports as wSOL`);
    console.log("> Transaction signature:", signature);

    return wsolAta.address;
  } catch (e) {
    console.error("> Error wrapping SOL:", e);
    throw e;
  }
}

export async function transferSol(
  connection: Connection,
  destination: PublicKey,
  amountSol: number
) {
  const localWalletPath = "/Users/admin/.config/solana/id.json"; // replace admin with yours
  const localWallet = await loadKeypairFromFile(localWalletPath);
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(localWallet),
    { preflightCommitment: commitment }
  );

  if (!provider || !provider.wallet) {
    throw new Error(
      "Provider or wallet not found. Make sure Anchor provider is set."
    );
  }

  const sender = provider.wallet.publicKey;
  const recipient = destination;
  const lamports = amountSol * LAMPORTS_PER_SOL;

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey: recipient,
      lamports,
    })
  );

  const signature = await provider.sendAndConfirm(tx);
  console.log(
    `> Transferred ${amountSol} SOL from ${sender.toBase58()} to ${destination}`
  );
  console.log(`> Tx Signature: ${signature}`);

  return signature;
}
