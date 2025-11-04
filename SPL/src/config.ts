
export const TOKEN_CONFIG = {
  name: "TurboToken",
  symbol: "TURBO",
  decimals: 9,
  description: "A creative Turbin3 token for the ecosystem",
  initialSupply: 1_000_000, 
  uri: "https://avatars.githubusercontent.com/u/114608872?s=48&v=4", 
  sellerFeeBasisPoints: 0,
};


export const PATHS = {
  wallet: "./wallet.json",
  mintInfo: "./mint-info.json",
};


export const NETWORK_CONFIG = {
  cluster: "devnet" as const,
  commitment: "confirmed" as const,
  minimumBalance: 0.1, // SOL
};

