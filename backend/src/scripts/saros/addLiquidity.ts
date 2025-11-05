import "dotenv/config";
import {
    PublicKey,
    Transaction,
    Keypair,
    Connection,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
    getMaxBinArray,
    getMaxPosition,
    createUniformDistribution,
    LiquidityShape,
    getBinRange,
    findPosition,
} from "@saros-finance/dlmm-sdk";
import {
    getOrCreateAssociatedTokenAccount,
    getAccount,
    NATIVE_MINT,
    createSyncNativeInstruction,
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    getMint,
} from "@solana/spl-token";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import { dlmmClient } from "../../sdk/client"; // hoặc ../service/client tùy project của bạn
import { getKeypairFromFile } from "../config";
import os from "os";
import { CUSTOM_TOKEN_DEVNET, WSOL_TOKEN_DEVNET } from "./createPool";

/**
 * Convert amount (e.g. 10) => BN(amount * 10^decimals)
 * Returns BN which is safe for on-chain sdk calls.
 */
const convertBalanceToWei = (amount: number | string, decimals: number = 9): BN => {
    const bn = new BigNumber(amount);
    const multiplier = new BigNumber(10).pow(decimals);
    const res = bn.multipliedBy(multiplier).toFixed(0); // integer string
    return new BN(res);
};

export const CUSTOM_WSOL_POOL = {
    address: "5ehvmfyB29RCSu1bysYGvThs6HuhEKWBPEZzi1fTd87t",
    baseToken: CUSTOM_TOKEN_DEVNET,
    quoteToken: WSOL_TOKEN_DEVNET,
    slippage: 0.5,
};

async function signAndSendRaw(connection: Connection, tx: Transaction, signers: Keypair[]) {
    // Prepare tx (recentBlockhash / feePayer must be set by caller)
    if (!tx.recentBlockhash) {
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
    }
    if (!tx.feePayer) tx.feePayer = signers[0].publicKey;
    tx.sign(...signers);

    const serialized = tx.serialize();
    const sig = await connection.sendRawTransaction(serialized, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
    });

    // confirm
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "finalized"
    );

    return sig;
}

async function ensureAtaAndAccount(connection: Connection, payer: Keypair, mintPubkey: PublicKey) {
    // choose token program for token2022 vs spl-token
    const programId =
        mintPubkey.toBase58() === CUSTOM_TOKEN_DEVNET.mintAddress
            ? TOKEN_2022_PROGRAM_ID
            : TOKEN_PROGRAM_ID;

    const ata = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintPubkey,
        payer.publicKey,
        false,
        undefined,
        undefined,
        programId
    );

    const rawAccount = await getAccount(connection, ata.address, undefined, programId).catch(() => null);
    return { ata, rawAccount, programId };
}

async function wrapSolToWSOL(connection: Connection, payer: Keypair, lamportsToWrap: number) {
    const wsolAta = await getOrCreateAssociatedTokenAccount(connection, payer, NATIVE_MINT, payer.publicKey);
    const tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: wsolAta.address,
            lamports: lamportsToWrap,
        }),
        createSyncNativeInstruction(wsolAta.address)
    );
    const sig = await signAndSendRaw(connection, tx, [payer]);
    console.log(`💧 Wrapped ${lamportsToWrap / LAMPORTS_PER_SOL} SOL into WSOL -> tx ${sig}`);
    return wsolAta;
}

async function onAddliquidity() {
    const tokenX = CUSTOM_WSOL_POOL.baseToken;
    const tokenY = CUSTOM_WSOL_POOL.quoteToken;
    const wallet = getKeypairFromFile(`${os.homedir()}/.config/solana/id.json`);
    const payer = wallet.publicKey;
    const pair = new PublicKey(CUSTOM_WSOL_POOL.address);
    const shape = LiquidityShape.Curve;
    const binRange = [-10, 10] as [number, number];

    console.log("🌐 DLMM client / connection init...");
    // @ts-ignore
    const connection: Connection = dlmmClient.getLiquidityBookServices().connection;

    console.log("📊 Fetching pool & user positions...");
    const positions = await dlmmClient.getLiquidityBookServices().getUserPositions({ payer, pair });
    const pairInfo = await dlmmClient.getLiquidityBookServices().getPairAccount(pair);
    const activeBin = pairInfo.activeId;

    // Ensure WSOL if needed (wrap 1 SOL as example)
    if (tokenY.mintAddress === WSOL_TOKEN_DEVNET.mintAddress) {
        // Check current WSOL ATA balance first
        const { ata: wsolAta, rawAccount } = await ensureAtaAndAccount(connection, wallet, new PublicKey(tokenY.mintAddress));
        if (!rawAccount || Number(rawAccount.amount) < 1 * LAMPORTS_PER_SOL) {
            await wrapSolToWSOL(connection, wallet, 1 * LAMPORTS_PER_SOL);
        } else {
            console.log("💧 WSOL ATA present and has balance.");
        }
    }

    // ensure token ATAs for both tokens
    const ataX = await ensureAtaAndAccount(connection, wallet, new PublicKey(tokenX.mintAddress));
    const ataY = await ensureAtaAndAccount(connection, wallet, new PublicKey(tokenY.mintAddress));
    console.log(`💼 Token balances -> ${tokenX.name}: ${ataX.rawAccount?.amount ?? 0}, ${tokenY.name}: ${ataY.rawAccount?.amount ?? 0}`);

    // prepare distributions & arrays
    const maxPositionList = getMaxPosition([binRange[0], binRange[1]], activeBin);
    const maxLiqDistribution = createUniformDistribution({ shape, binRange });
    const binArrayList = getMaxBinArray(binRange, activeBin);

    // blockhash state
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    let currentBlockhash = blockhash;
    let currentLastValidBlockHeight = lastValidBlockHeight;

    type TxWithSigners = { tx: Transaction; signers: Keypair[] };
    const allTxs: TxWithSigners[] = [];
    const txsCreatePosition: TxWithSigners[] = [];

    // Pre-fetch binArrays & pair vaults / user vaults to build initialTransaction (so on-chain accounts are loaded)
    const initialTransaction = new Transaction();

    await Promise.all(
        binArrayList.map(async (b) => {
            await dlmmClient.getLiquidityBookServices().getBinArray({
                binArrayIndex: b.binArrayLowerIndex,
                pair,
                payer,
                transaction: initialTransaction as any,
            });
            await dlmmClient.getLiquidityBookServices().getBinArray({
                binArrayIndex: b.binArrayUpperIndex,
                pair,
                payer,
                transaction: initialTransaction as any,
            });
        })
    );

    await Promise.all(
        [tokenX, tokenY].map(async (token) => {
            await dlmmClient.getLiquidityBookServices().getPairVaultInfo({
                payer,
                transaction: initialTransaction as any,
                tokenAddress: new PublicKey(token.mintAddress),
                pair,
            });
            await dlmmClient.getLiquidityBookServices().getUserVaultInfo({
                payer,
                tokenAddress: new PublicKey(token.mintAddress),
                transaction: initialTransaction as any,
            });
        })
    );

    if (initialTransaction.instructions.length > 0) {
        initialTransaction.recentBlockhash = currentBlockhash;
        initialTransaction.feePayer = payer;
        allTxs.push({ tx: initialTransaction, signers: [wallet] });
    }

    // Build maxLiquidityDistributions (use your provided logic)
    const maxLiquidityDistributions = await Promise.all(
        maxPositionList.map(async (item) => {
            const { range: relativeBinRange, binLower, binUpper } = getBinRange(item, activeBin);
            const currentPosition = positions.find(findPosition(item, activeBin));

            const findStartIndex = maxLiqDistribution.findIndex((d) => d.relativeBinId === relativeBinRange[0]);
            const startIndex = findStartIndex === -1 ? 0 : findStartIndex;

            const findEndIndex = maxLiqDistribution.findIndex((d) => d.relativeBinId === relativeBinRange[1]);
            const endIndex = findEndIndex === -1 ? maxLiqDistribution.length : findEndIndex + 1;

            const liquidityDistribution = maxLiqDistribution.slice(startIndex, endIndex);

            const binArray = binArrayList.find(
                (b) => b.binArrayLowerIndex * 256 <= binLower && (b.binArrayUpperIndex + 1) * 256 > binUpper
            );
            if (!binArray) throw new Error("No matching binArray found for position range");

            // fetch binArray accounts
            const binArrayLower = await dlmmClient.getLiquidityBookServices().getBinArray({
                binArrayIndex: binArray.binArrayLowerIndex,
                pair,
                payer,
            });
            const binArrayUpper = await dlmmClient.getLiquidityBookServices().getBinArray({
                binArrayIndex: binArray.binArrayUpperIndex,
                pair,
                payer,
            });

            if (!currentPosition) {
                const transaction = new Transaction();
                const positionMint = Keypair.generate();

                const { position } = await dlmmClient.getLiquidityBookServices().createPosition({
                    pair,
                    payer,
                    relativeBinIdLeft: relativeBinRange[0],
                    relativeBinIdRight: relativeBinRange[1],
                    binArrayIndex: binArray.binArrayLowerIndex,
                    positionMint: positionMint.publicKey,
                    transaction: transaction as any,
                });

                transaction.feePayer = payer;
                transaction.recentBlockhash = currentBlockhash;

                txsCreatePosition.push({ tx: transaction, signers: [positionMint, wallet] });
                allTxs.push({ tx: transaction, signers: [positionMint, wallet] });

                return {
                    positionMint: positionMint.publicKey.toString(),
                    position,
                    liquidityDistribution,
                    binArrayLower: binArrayLower.toString(),
                    binArrayUpper: binArrayUpper.toString(),
                };
            }

            return {
                positionMint: currentPosition.positionMint,
                liquidityDistribution,
                binArrayLower: binArrayLower.toString(),
                binArrayUpper: binArrayUpper.toString(),
            };
        })
    );

    // Build addLiquidity txs
    const txsAddLiquidity = await Promise.all(
        maxLiquidityDistributions.map(async (item) => {
            const { binArrayLower, binArrayUpper, liquidityDistribution, positionMint } = item;
            const transaction = new Transaction();

            // compute amounts as BN
            const amountX = convertBalanceToWei(10, tokenX.decimals); // change 10 => desired amount
            const amountY = convertBalanceToWei(1, tokenY.decimals);  // change 1 => desired amount

            // debug logs - must be > 0
            console.log("🧮 addLiquidity -> amountX (wei):", amountX.toString());
            console.log("🧮 addLiquidity -> amountY (wei):", amountY.toString());
            console.log("  -> positionMint:", positionMint);
            console.log("  -> binArrayLower:", binArrayLower);
            console.log("  -> binArrayUpper:", binArrayUpper);

            await dlmmClient.getLiquidityBookServices().addLiquidityIntoPosition({
                amountX: convertBalanceToWei(10, tokenX.decimals).toNumber(),
                amountY: convertBalanceToWei(1, tokenY.decimals).toNumber(),
                binArrayLower: new PublicKey(binArrayLower),
                binArrayUpper: new PublicKey(binArrayUpper),
                liquidityDistribution,
                pair,
                positionMint: new PublicKey(positionMint),
                payer,
                transaction: transaction as any,
            });

            transaction.recentBlockhash = currentBlockhash;
            transaction.feePayer = payer;

            allTxs.push({ tx: transaction, signers: [wallet] });
            return transaction;
        })
    );

    // ensure all remaining txs have blockhash/feePayer
    for (const entry of allTxs) {
        if (!entry.tx.recentBlockhash) entry.tx.recentBlockhash = currentBlockhash;
        if (!entry.tx.feePayer) entry.tx.feePayer = payer;
    }

    // Create a shallow copy for signing/consuming
    const signedTxs = allTxs.slice();
    const hashes: string[] = [];

    // send initial tx (if any)
    if (initialTransaction.instructions.length) {
        const entry = signedTxs.shift() || { tx: initialTransaction, signers: [wallet] } as TxWithSigners;
        if (entry.signers && entry.signers.length) entry.tx.sign(...entry.signers);
        const txHash = await connection.sendRawTransaction(entry.tx.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed",
        });
        hashes.push(txHash);

        await connection.confirmTransaction(
            { signature: txHash, blockhash: currentBlockhash, lastValidBlockHeight: currentLastValidBlockHeight },
            "finalized"
        );

        // refresh blockhash
        const nb = await connection.getLatestBlockhash();
        currentBlockhash = nb.blockhash;
        currentLastValidBlockHeight = nb.lastValidBlockHeight;
    }

    // send created-position txs
    if (txsCreatePosition.length) {
        await Promise.all(
            txsCreatePosition.map(async (_entry) => {
                const entry = signedTxs.shift() || _entry;
                if (entry.signers && entry.signers.length) entry.tx.sign(...entry.signers);
                const serialized = entry.tx.serialize();
                const txHash = await connection.sendRawTransaction(serialized, {
                    skipPreflight: false,
                    preflightCommitment: "confirmed",
                });
                hashes.push(txHash);

                await connection.confirmTransaction(
                    { signature: txHash, blockhash: currentBlockhash, lastValidBlockHeight: currentLastValidBlockHeight },
                    "finalized"
                );
            })
        );

        const nb = await connection.getLatestBlockhash();
        currentBlockhash = nb.blockhash;
        currentLastValidBlockHeight = nb.lastValidBlockHeight;
    }

    // send addLiquidity txs
    await Promise.all(
        txsAddLiquidity.map(async (_tx) => {
            const entry = signedTxs.shift() || { tx: _tx, signers: [wallet] } as TxWithSigners;
            if (entry.signers && entry.signers.length) entry.tx.sign(...entry.signers);
            const serialized = entry.tx.serialize();
            const txHash = await connection.sendRawTransaction(serialized, {
                skipPreflight: false,
                preflightCommitment: "confirmed",
            });
            hashes.push(txHash);

            await connection.confirmTransaction(
                { signature: txHash, blockhash: currentBlockhash, lastValidBlockHeight: currentLastValidBlockHeight },
                "finalized"
            );
        })
    );

    console.log("Transaction hashes:", hashes);
}

onAddliquidity()
    .then(() => {
        console.log("🎉 Done adding liquidity.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error adding liquidity:", error);
        process.exit(1);
    });
