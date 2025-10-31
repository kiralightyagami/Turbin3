import {
  tokenMetadata,
  filePath,
  endpoint,
  loadKeypairFromFile,
} from "./utilities";
import {
  createV1,
  findMetadataPda,
  mplTokenMetadata,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  keypairIdentity,
  percentAmount,
  publicKey,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import promptSync from "prompt-sync";

async function addMetadata() {
  const prompt = promptSync();

  const mintAddress: string = prompt("Enter mint address: ");
  const mint = publicKey(mintAddress);

  const umi = createUmi(endpoint).use(mplTokenMetadata()).use(mplToolbox());
  const walletKeypair = loadKeypairFromFile(filePath);
  const wallet = umi.eddsa.createKeypairFromSecretKey(
    new Uint8Array(walletKeypair.secretKey)
  );
  umi.use(keypairIdentity(wallet));

  console.log("Mint address:", mint);

  const metadataAccountAddress = await findMetadataPda(umi, {
    mint: mint,
  });

  const txn = await createV1(umi, {
    mint,
    authority: umi.identity,
    payer: umi.identity,
    updateAuthority: umi.identity,
    metadata: metadataAccountAddress,
    name: tokenMetadata.name,
    symbol: tokenMetadata.symbol,
    uri: tokenMetadata.uri,
    sellerFeeBasisPoints: percentAmount(0),
    tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(umi);

  let txnSig = base58.deserialize(txn.signature);
  console.log(`Metadata added to ${mint}. Txn signature: ${txnSig[0]}`);
}

// Call addMetadata function
addMetadata();
