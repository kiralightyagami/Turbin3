Escrow Program

A simple and secure escrow program built on the Solana Devnet.

## Screenshot

![Escrow Screenshot](Screenshot1.png) 

## Setup and Usage

1. Clone and install dependencies:

```bash
git clone https://github.com/
cd task2/escrow
yarn install
```

2. Run the escrow program:

```bash
yarn execute
```

## Tests

```bash
anchor test
```

## Deployment

Ensure your environment is configured for Devnet in Anchor.toml:

```toml
[programs.devnet]
escrow = "<YOUR_PROGRAM_ID>"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"
```

> Ensure your local or devnet wallet is funded (via airdrop or manual transfer) before running any transactions.

Set Solana CLI to devnet and deploy the program:

```bash
solana config set --url devnet
anchor deploy
```


