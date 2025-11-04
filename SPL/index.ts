import { Connection, clusterApiUrl } from "@solana/web3.js";
import { NETWORK_CONFIG } from "./src/config";
import { loadOrCreateWallet, checkWalletBalance } from "./src/wallet";
import { createMintAccount, mintTokens } from "./src/token";
import { createMetadataAccount } from "./src/metadata";
import { saveMintInfo, displaySummary, displayError } from "./src/utils";


async function main() {
  try {
    console.log("Starting Token Mint Creation...\n");

   
    const connection = new Connection(
      clusterApiUrl(NETWORK_CONFIG.cluster),
      NETWORK_CONFIG.commitment
    );

    
    const wallet = loadOrCreateWallet();

   
    const hasBalance = await checkWalletBalance(connection, wallet);
    if (!hasBalance) {
      return;
    }

   
    const { mintKeypair, associatedTokenAddress, signature: mintSignature } = 
      await createMintAccount(connection, wallet);

   
    const { metadataAddress, signature: metadataSignature } = 
      await createMetadataAccount(connection, wallet, mintKeypair);

    
    const mintingSignature = await mintTokens(
      connection,
      wallet,
      mintKeypair,
      associatedTokenAddress
    );

    
    saveMintInfo(
      mintKeypair.publicKey,
      associatedTokenAddress,
      metadataAddress,
      wallet.publicKey,
      {
        mintCreation: mintSignature,
        metadataCreation: metadataSignature,
        tokenMinting: mintingSignature,
      }
    );

    
    displaySummary(mintKeypair.publicKey);

  } catch (error) {
    displayError(error as Error);
    process.exit(1);
  }
}


main();
