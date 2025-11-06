import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore, transfer, fetchAssetV1 } from '@metaplex-foundation/mpl-core';
import { createSignerFromKeypair, keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import { existsSync, readFileSync } from 'fs';

async function getIdentity(umi: ReturnType<typeof createUmi>) {
	if (!existsSync('wallet.json')) {
		throw new Error('wallet.json not found. Run `bun run index.ts` once to generate.');
	}
	const raw = readFileSync('wallet.json', 'utf-8');
	const secretKey: number[] = JSON.parse(raw);
	const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
	const signer = createSignerFromKeypair(umi, keypair);
	umi.use(keypairIdentity(signer));
	return signer;
}

async function main() {
	const rpc = process.env.DEVNET_RPC ?? 'https://api.devnet.solana.com';
	const umi = createUmi(rpc).use(mplCore());

	await getIdentity(umi);

	const assetAddressStr = process.env.ASSET;
	const recipientStr = process.env.RECIPIENT;

	if (!assetAddressStr || !recipientStr) {
		console.error('Missing required env vars: ASSET and RECIPIENT');
		console.error('Example: ASSET=... RECIPIENT=... bun run transfer.ts');
		process.exit(1);
	}

	const assetPk = publicKey(assetAddressStr);
	const recipientPk = publicKey(recipientStr);

	const assetAccount = await fetchAssetV1(umi, assetPk);

	await transfer(umi, {
		asset: assetAccount,
		newOwner: recipientPk,
	}).sendAndConfirm(umi);

	console.log('Transferred asset');
	console.log('Asset:', assetPk.toString());
	console.log('New Owner:', recipientPk.toString());
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});


