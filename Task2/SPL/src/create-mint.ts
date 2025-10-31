import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  commitment,
  endpoint,
  getOrCreateMintAuthority,
  requestAirdrop,
} from "./utilities";

const connection: Connection = new Connection(endpoint, commitment);

async function createTokenMint(mintAuthority: Keypair): Promise<PublicKey> {
  try {
    await requestAirdrop(connection, mintAuthority);
    const mintAccount = Keypair.generate();
    let mintPubkey = await createMint(
      connection,
      mintAuthority, // payer
      mintAuthority.publicKey, // mint authority
      mintAuthority.publicKey, // freeze authority
      6, // decimals
      mintAccount, // mint keypair
      {
        commitment: commitment,
      },
      TOKEN_PROGRAM_ID
    );
    console.log("> Token mint created!", mintPubkey.toBase58());
    return mintPubkey;
  } catch (e) {
    console.log("> Error creating token mint:", e);
    throw e;
  }
}

(async () => {
  const mintAuthority = getOrCreateMintAuthority();
  console.log("Mint authority:", mintAuthority.publicKey.toBase58());
  await createTokenMint(mintAuthority);
  console.log("> Create mint done!");
})();
