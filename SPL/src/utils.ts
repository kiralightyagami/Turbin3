import * as fs from "fs";
import { MintInfo, TransactionSignatures } from "./types";
import { TOKEN_CONFIG, PATHS } from "./config";
import { PublicKey } from "@solana/web3.js";


export function saveMintInfo(
  mintAddress: PublicKey,
  associatedTokenAccount: PublicKey,
  metadataAddress: PublicKey,
  walletAddress: PublicKey,
  transactions: TransactionSignatures
): void {
  const mintInfo: MintInfo = {
    tokenName: TOKEN_CONFIG.name,
    tokenSymbol: TOKEN_CONFIG.symbol,
    decimals: TOKEN_CONFIG.decimals,
    initialSupply: TOKEN_CONFIG.initialSupply,
    mintAddress: mintAddress.toBase58(),
    associatedTokenAccount: associatedTokenAccount.toBase58(),
    metadataAddress: metadataAddress.toBase58(),
    walletAddress: walletAddress.toBase58(),
    transactions,
  };

  fs.writeFileSync(PATHS.mintInfo, JSON.stringify(mintInfo, null, 2));
  console.log("Mint info saved to", PATHS.mintInfo);
}


export function displaySummary(mintAddress: PublicKey): void {
  console.log("\n" + "=".repeat(60));
  console.log("TOKEN CREATION COMPLETE!");
  console.log("=".repeat(60));
  console.log("\nSummary:");
  console.log("Token Name:", TOKEN_CONFIG.name);
  console.log("Token Symbol:", TOKEN_CONFIG.symbol);
  console.log("Mint Address:", mintAddress.toBase58());
  console.log("Initial Supply:", TOKEN_CONFIG.initialSupply);
  console.log("\nView on Solana Explorer:");
  console.log("https://explorer.solana.com/address/" + mintAddress.toBase58() + "?cluster=devnet");
  console.log("\n");
}


export function displayError(error: Error): void {
  console.error("Error:", error.message);
  console.error("\nTroubleshooting:");
  console.error("1. Check your SOL balance: solana balance");
  console.error("2. Airdrop more SOL: solana airdrop 2");
  console.error("3. Verify you're on devnet: solana config get");
  console.error("\n");
}

