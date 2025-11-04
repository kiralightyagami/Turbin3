import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import { PATHS, NETWORK_CONFIG } from "./config";


export function loadOrCreateWallet(): Keypair {
  const walletPath = PATHS.wallet;

  if (fs.existsSync(walletPath)) {
    const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
    const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    console.log("Loaded existing wallet");
    return wallet;
  } else {
    const wallet = Keypair.generate();
    fs.writeFileSync(walletPath, JSON.stringify(Array.from(wallet.secretKey)));
    console.log("Created new wallet");
    console.log("Please airdrop some SOL to this address:", wallet.publicKey.toBase58());
    console.log("Run: solana airdrop 2 " + wallet.publicKey.toBase58() + " --url devnet\n");
    return wallet;
  }
}


export async function checkWalletBalance(
  connection: Connection,
  wallet: Keypair
): Promise<boolean> {
  console.log("Wallet Address:", wallet.publicKey.toBase58());

  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Wallet Balance:", balance / 1e9, "SOL\n");

  if (balance < NETWORK_CONFIG.minimumBalance * 1e9) {
    console.log("Low balance! Please airdrop SOL first:");
    console.log("solana airdrop 2 " + wallet.publicKey.toBase58() + " --url devnet");
    return false;
  }

  return true;
}

