import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { create as createAsset, createCollection, fetchCollectionV1 } from '@metaplex-foundation/mpl-core';
import { generateSigner, keypairIdentity, createSignerFromKeypair, sol } from '@metaplex-foundation/umi';
import { existsSync, readFileSync } from 'fs';

async function uploadJsonToPinata(jsonData: unknown, name: string): Promise<string> {
	const jwt = process.env.PINATA_JWT;
	if (!jwt) throw new Error('PINATA_JWT not set');
	const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${jwt}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			pinataOptions: { cidVersion: 1 },
			pinataMetadata: { name },
			pinataContent: jsonData,
		})
	});
	if (!res.ok) {
		const txt = await res.text();
		throw new Error(`Pinata upload failed for ${name}: ${res.status} ${txt}`);
	}
	const out = await res.json() as { IpfsHash: string };
	const gateway = process.env.PINATA_GATEWAY_BASE ?? 'https://gateway.pinata.cloud/ipfs';
	return `${gateway}/${out.IpfsHash}`;
}

// Simple helper to load a keypair from a local wallet.json if present; otherwise generate one.
async function getOrCreateIdentity(umi: ReturnType<typeof createUmi>) {
	if (existsSync('wallet.json')) {
		const raw = readFileSync('wallet.json', 'utf-8');
		const secretKey: number[] = JSON.parse(raw);
		const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
		const signer = createSignerFromKeypair(umi, keypair);
		umi.use(keypairIdentity(signer));
		return signer;
	}

	const signer = generateSigner(umi);
	umi.use(keypairIdentity(signer));
	await Bun.write('wallet.json', JSON.stringify(Array.from(signer.secretKey)));
	return signer;
}

async function main() {
	
	const rpc = process.env.DEVNET_RPC ?? 'https://api.devnet.solana.com';
	const umi = createUmi(rpc).use(mplCore());

	const signer = await getOrCreateIdentity(umi);

	
	try {
		await umi.rpc.airdrop(signer.publicKey, sol(1));
	} catch {}

	// Create a collection for the anime characters
	const collectionSigner = generateSigner(umi);
	const collectionName = process.env.COLLECTION_NAME ?? 'Anime Legends';
	
	if (!existsSync('collection.json')) throw new Error('Missing collection.json in Task2/NFT');
	if (!process.env.PINATA_JWT) throw new Error('Missing PINATA_JWT in environment');
	const collectionRaw = readFileSync('collection.json', 'utf-8');
	const collectionJson = JSON.parse(collectionRaw);
	const collectionUri = await uploadJsonToPinata(collectionJson, 'collection.json');
	console.log('Uploaded collection.json to:', collectionUri);

	const createSig = await createCollection(umi, {
		name: collectionName,
		uri: collectionUri,
		collection: collectionSigner,
		updateAuthority: signer.publicKey,
	}).sendAndConfirm(umi);

	
	async function sleep(ms: number) {
		return new Promise((r) => setTimeout(r, ms));
	}

	let collection;
	for (let attempt = 1; attempt <= 10; attempt++) {
		try {
			collection = await fetchCollectionV1(umi, collectionSigner.publicKey);
			break;
		} catch (e) {
			if (attempt === 10) throw e;
			await sleep(500 * attempt);
		}
	}

	
	async function uploadLocalJson(filename: string): Promise<string> {
		if (!existsSync(filename)) throw new Error(`Missing ${filename} in Task2/NFT`);
		if (!process.env.PINATA_JWT) throw new Error('Missing PINATA_JWT in environment');
		const raw = readFileSync(filename, 'utf-8');
		const json = JSON.parse(raw);
		const url = await uploadJsonToPinata(json, filename);
		console.log(`Uploaded ${filename} to:`, url);
		return url;
	}

	const items = [
		{ name: 'Kira', uri: await uploadLocalJson('kira.json') },
		{ name: 'L', uri: await uploadLocalJson('l.json') },
		{ name: 'Ayanokoji', uri: await uploadLocalJson('ayanokoji.json') },
		{ name: 'Gojo', uri: await uploadLocalJson('gojo.json') },
		{ name: 'Jin-Woo', uri: await uploadLocalJson('jinwoo.json') },
	];

	console.log('Created Collection:', collectionName, collectionSigner.publicKey.toString());

	for (const item of items) {
		const asset = generateSigner(umi);
		await createAsset(umi, {
			name: `${item.name} NFT`,
			uri: item.uri,
			asset,
			owner: signer.publicKey,
			collection,
			authority: signer,
		}).sendAndConfirm(umi);
		console.log(`Minted ${item.name}:`, asset.publicKey.toString());
	}

	console.log('Owner:', signer.publicKey.toString());
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});