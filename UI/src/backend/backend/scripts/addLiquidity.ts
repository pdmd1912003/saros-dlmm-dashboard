import "dotenv/config";
import { PublicKey, Transaction, Keypair, Connection } from "@solana/web3.js";
import { getMaxBinArray, getMaxPosition, createUniformDistribution, LiquidityShape, getBinRange, findPosition } from "@saros-finance/dlmm-sdk";
import { getOrCreateAssociatedTokenAccount, getMint } from "@solana/spl-token";
import bigDecimal from "js-big-decimal";
import { dlmmClient } from "../service/client";
import { getKeypairFromFile } from "./config";
import os from "os";
import { CUSTOM_TOKEN_DEVNET, WSOL_TOKEN_DEVNET } from "./createPool";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const convertBalanceToWei = (strValue: number, iDecimal: number = 9) => {
    if (strValue === 0) return 0;

    try {
        const multiplyNum = new bigDecimal(Math.pow(10, iDecimal));
        const convertValue = new bigDecimal(Number(strValue));
        const result = multiplyNum.multiply(convertValue);
        return result.getValue();
    } catch {
        return 0;
    }   
};
export const CUSTOM_WSOL_POOL = {
    address: "5TaKjwAnbD2jnaPyHUWy1a6WCaE2xx6nm5SkLU42f5ry",
    baseToken: CUSTOM_TOKEN_DEVNET,
    quoteToken: WSOL_TOKEN_DEVNET,
    slippage: 0.5,
}

async function onAddliquidity() {
    const tokenX = CUSTOM_WSOL_POOL.baseToken;
    const tokenY = CUSTOM_WSOL_POOL.quoteToken;
    const wallet = getKeypairFromFile(`${os.homedir()}/.config/solana/id.json`);
    const payer = wallet.publicKey;
    const pair = new PublicKey(CUSTOM_WSOL_POOL.address);
    const shape = LiquidityShape.Curve;
    const binRange = [-10, 10] as [number, number]; // Example bin range
    const positions = await dlmmClient.getLiquidityBookServices().getUserPositions({
        payer,
        pair,
    });
    const pairInfo = await dlmmClient.getLiquidityBookServices().getPairAccount(pair);
    const activeBin = pairInfo.activeId;

    const connection = dlmmClient.getLiquidityBookServices().connection;

    const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

    let currentBlockhash = blockhash;
    let currentLastValidBlockHeight = lastValidBlockHeight;

    const maxPositionList = getMaxPosition(
        [binRange[0], binRange[1]],
        activeBin
    );

    const maxLiqDistribution = createUniformDistribution({
        shape,
        binRange,
    });

    const binArrayList = getMaxBinArray(binRange, activeBin);

    type TxWithSigners = { tx: Transaction; signers: Keypair[] };
    const allTxs: TxWithSigners[] = [];
    const txsCreatePosition: TxWithSigners[] = [];

    const initialTransaction = new Transaction();

    await Promise.all(
        binArrayList.map(async (item) => {
            await dlmmClient.getLiquidityBookServices().getBinArray({
                binArrayIndex: item.binArrayLowerIndex,
                pair: new PublicKey(pair),
                payer,
                transaction: initialTransaction as any,
            });

            await dlmmClient.getLiquidityBookServices().getBinArray({
                binArrayIndex: item.binArrayUpperIndex,
                pair: new PublicKey(pair),
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
                pair: new PublicKey(pair),
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

    const maxLiquidityDistributions = await Promise.all(
        maxPositionList.map(async (item) => {
            const {
                range: relativeBinRange,
                binLower,
                binUpper,
            } = getBinRange(item, activeBin);
            const currentPosition = positions.find(findPosition(item, activeBin));

            const findStartIndex = maxLiqDistribution.findIndex(
                (item) => item.relativeBinId === relativeBinRange[0]
            );
            const startIndex = findStartIndex === -1 ? 0 : findStartIndex;

            const findEndIndex = maxLiqDistribution.findIndex(
                (item) => item.relativeBinId === relativeBinRange[1]
            );
            const endIndex =
                findEndIndex === -1 ? maxLiqDistribution.length : findEndIndex + 1;

            const liquidityDistribution = maxLiqDistribution.slice(
                startIndex,
                endIndex
            );

            const binArray = binArrayList.find(
                (item) =>
                    item.binArrayLowerIndex * 256 <= binLower &&
                    (item.binArrayUpperIndex + 1) * 256 > binUpper
            )!;

            const binArrayLower = await dlmmClient.getLiquidityBookServices().getBinArray({
                binArrayIndex: binArray.binArrayLowerIndex,
                pair: new PublicKey(pair),
                payer,
            });
            const binArrayUpper = await dlmmClient.getLiquidityBookServices().getBinArray({
                binArrayIndex: binArray.binArrayUpperIndex,
                pair: new PublicKey(pair),
                payer,
            });

            if (!currentPosition) {
                const transaction = new Transaction();

                const positionMint = Keypair.generate();

                const { position } = await dlmmClient.getLiquidityBookServices().createPosition({
                    pair: new PublicKey(pair),
                    payer,
                    relativeBinIdLeft: relativeBinRange[0],
                    relativeBinIdRight: relativeBinRange[1],
                    binArrayIndex: binArray.binArrayLowerIndex,
                    positionMint: positionMint.publicKey,
                    transaction: transaction as any,
                });
                transaction.feePayer = payer;
                transaction.recentBlockhash = currentBlockhash;

                // Do not pre-sign here; store required signers and sign right before sending
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

    const txsAddLiquidity = await Promise.all(
        maxLiquidityDistributions.map(async (item) => {
            const {
                binArrayLower,
                binArrayUpper,
                liquidityDistribution,
                positionMint,
            } = item;
            const transaction = new Transaction();
            await dlmmClient.getLiquidityBookServices().addLiquidityIntoPosition({
                amountX: Number(convertBalanceToWei(10, tokenX.decimals)),
                amountY: Number(convertBalanceToWei(1, tokenY.decimals)),
                binArrayLower: new PublicKey(binArrayLower),
                binArrayUpper: new PublicKey(binArrayUpper),
                liquidityDistribution,
                pair: new PublicKey(pair),
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
    // ensure feePayer/recentBlockhash on remaining txs and keep signers list
    for (const entry of allTxs) {
        entry.tx.feePayer = payer;
        entry.tx.recentBlockhash = currentBlockhash;
    }

    const signedTxs = allTxs.slice();

    const hash: string[] = [];

    if (initialTransaction.instructions.length) {
        const entry = signedTxs.shift() || { tx: initialTransaction, signers: [wallet] };
        // sign with all required signers right before serialization
        if (entry.signers && entry.signers.length) entry.tx.sign(...entry.signers);
        const txHash = await connection.sendRawTransaction(entry.tx.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed",
        });

        hash.push(txHash);

        await connection.confirmTransaction(
            {
                signature: txHash,
                blockhash: currentBlockhash,
                lastValidBlockHeight: currentLastValidBlockHeight,
            },
            "finalized"
        );

        const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash();

        currentBlockhash = blockhash;
        currentLastValidBlockHeight = lastValidBlockHeight;
    }
    if (txsCreatePosition.length) {
        await Promise.all(
            txsCreatePosition.map(async (_entry) => {
                const entry = signedTxs.shift() || _entry;
                if (entry.signers && entry.signers.length) entry.tx.sign(...entry.signers);
                const serializeTx = entry.tx.serialize();

                const txHash = await connection.sendRawTransaction(serializeTx, {
                    skipPreflight: false,
                    preflightCommitment: "confirmed",
                });

                hash.push(txHash);

                await connection.confirmTransaction(
                    {
                        signature: txHash,
                        blockhash: currentBlockhash,
                        lastValidBlockHeight: currentLastValidBlockHeight,
                    },
                    "finalized"
                );
                hash.push(txHash);
            })
        );

        const { blockhash, lastValidBlockHeight } =
            await connection!.getLatestBlockhash();

        currentBlockhash = blockhash;
        currentLastValidBlockHeight = lastValidBlockHeight;
    }

    // Transaction for adding liquidity
    await Promise.all(
        txsAddLiquidity.map(async (_tx) => {
            const entry = signedTxs.shift() || { tx: _tx, signers: [wallet] } as TxWithSigners;
            if (entry.signers && entry.signers.length) entry.tx.sign(...entry.signers);
            const serializeTx = entry.tx.serialize();

            const txHash = await connection.sendRawTransaction(serializeTx, {
                skipPreflight: false,
                preflightCommitment: "confirmed",
            });
            if (!txHash) return;

            hash.push(txHash);

            await connection!.confirmTransaction(
                {
                    signature: txHash,
                    blockhash: currentBlockhash,
                    lastValidBlockHeight: currentLastValidBlockHeight,
                },
                "finalized"
            );
        })
    );

    console.log("Transaction hashes:", hash);
};

onAddliquidity().catch((error) => {
    console.error("Error adding liquidity:", error);
    process.exit(1);
});