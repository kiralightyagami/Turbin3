import {
  clusterApiUrl,
  Commitment,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as fs from "fs";

export const tokenMetadata = {
  name: "Kira",
  symbol: "KIR",
  uri: "https://avatars.githubusercontent.com/u/114608872?v=4",
};

export const filePath = "./src/mint_authority.json";
// export const endpoint: string = "http://127.0.0.1:8899"; // for local
export const endpoint: string = clusterApiUrl("devnet");
export const commitment: Commitment = "confirmed";

export function getOrCreateMintAuthority(): Keypair {
  if (fs.existsSync(filePath)) {
    return loadKeypairFromFile(filePath);
  } else {
    const keypair = Keypair.generate();
    fs.writeFileSync(filePath, JSON.stringify(Array.from(keypair.secretKey)));
    console.log("Created new mint authority at:", filePath);
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
    } catch (e) {
      console.log("Airdrop request failed:", e);
    }
    console.log(`Airdrop to ${keypair.publicKey} is successful`);
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
