import { Keypair, PublicKey } from "@solana/web3.js";

export interface MintInfo {
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  initialSupply: number;
  mintAddress: string;
  associatedTokenAccount: string;
  metadataAddress: string;
  walletAddress: string;
  transactions: {
    mintCreation: string;
    metadataCreation: string;
    tokenMinting: string;
  };
}

export interface TokenAccounts {
  mintKeypair: Keypair;
  associatedTokenAddress: PublicKey;
  metadataAddress: PublicKey;
}

export interface TransactionSignatures {
  mintCreation: string;
  metadataCreation: string;
  tokenMinting: string;
}

