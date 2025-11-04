import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { TOKEN_CONFIG } from "./config";


export function deriveMetadataAddress(mintPublicKey: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintPublicKey.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return address;
}


export async function createMetadataAccount(
  connection: Connection,
  wallet: Keypair,
  mintKeypair: Keypair
): Promise<{ metadataAddress: PublicKey; signature: string }> {
  const metadataAddress = deriveMetadataAddress(mintKeypair.publicKey);

  console.log("Metadata Address:", metadataAddress.toBase58());

  const metadataInstruction = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataAddress,
      mint: mintKeypair.publicKey,
      mintAuthority: wallet.publicKey,
      payer: wallet.publicKey,
      updateAuthority: wallet.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: {
          name: TOKEN_CONFIG.name,
          symbol: TOKEN_CONFIG.symbol,
          uri: TOKEN_CONFIG.uri,
          sellerFeeBasisPoints: TOKEN_CONFIG.sellerFeeBasisPoints,
          creators: null,
          collection: null,
          uses: null,
        },
        isMutable: true,
        collectionDetails: null,
      },
    }
  );

  const metadataTransaction = new Transaction().add(metadataInstruction);

  console.log("Creating metadata account...");
  const signature = await sendAndConfirmTransaction(connection, metadataTransaction, [wallet]);
  console.log("Metadata created! Signature:", signature, "\n");

  return { metadataAddress, signature };
}

