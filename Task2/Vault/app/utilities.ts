import {
  clusterApiUrl,
  Commitment,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as fs from "fs";

export const tokenMetadata = {
  name: "Devwraithe",
  symbol: "DRT",
  uri: "https://raw.githubusercontent.com/devwraithe/token-assets/refs/heads/main/dvrt/metadata.json",
};

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
