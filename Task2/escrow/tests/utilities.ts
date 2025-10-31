import * as anchor from "@coral-xyz/anchor";

export async function requestAirdrop(
  connection: anchor.web3.Connection,
  publicKey: anchor.web3.PublicKey
) {
  const balance = await checkBalance(connection, publicKey);
  if (balance < 1.0) {
    console.log("> You do not have enough funds. Requesting airdrop...");
    try {
      const txn = await connection.requestAirdrop(
        publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(txn, "confirmed");
    } catch (e) {
      console.log("Airdrop request failed:", e);
    }
    console.log(`> Airdrop to ${publicKey} is successful`);
  } else {
    console.log("> You have enough funds to continue");
  }
}

export async function checkBalance(
  connection: anchor.web3.Connection,
  publicKey: anchor.web3.PublicKey
): Promise<number> {
  const lamportsBalance = await connection.getBalance(publicKey);
  const solBalance = lamportsBalance / anchor.web3.LAMPORTS_PER_SOL;
  console.log(solBalance);
  return solBalance;
}
