import "dotenv/config";
import { PublicKey, Transaction, Keypair, Connection } from "@solana/web3.js";
import { getMaxBinArray, getMaxPosition, createUniformDistribution, LiquidityShape } from "@saros-finance/dlmm-sdk";
import { getOrCreateAssociatedTokenAccount, getMint } from "@solana/spl-token";
import { USDC_TOKEN_DEVNET, WSOL_TOKEN_DEVNET, wallet } from "../../utils/config";
import { sarosDLMM } from "../services/sarosService";
import bigDecimal from "js-big-decimal";

async function addLiquidity() {
    try {
        // Kiểm tra connection
        const connection = sarosDLMM.connection;
        if (!connection) {
            throw new Error("Connection is not initialized");
        }

        // Kiểm tra ví
        console.log("Wallet public key:", wallet.publicKey.toBase58());

        // Kiểm tra số dư ví (SOL)
        const balance = await connection.getBalance(wallet.publicKey);
        console.log("SOL balance:", balance / 1e9, "SOL");
        if (balance < 0.01 * 1e9) {
            throw new Error("Insufficient SOL balance for transaction fees");
        }

        // Kiểm tra mint addresses
        await getMint(connection, new PublicKey(USDC_TOKEN_DEVNET.mintAddress));
        
        await getMint(connection, new PublicKey(WSOL_TOKEN_DEVNET.mintAddress));

        // Tạo hoặc lấy ATA
        const baseATA = await getOrCreateAssociatedTokenAccount(
            connection,
            wallet,
            new PublicKey(USDC_TOKEN_DEVNET.mintAddress),
            wallet.publicKey
        );
        const quoteATA = await getOrCreateAssociatedTokenAccount(
            connection,
            wallet,
            new PublicKey(WSOL_TOKEN_DEVNET.mintAddress),
            wallet.publicKey
        );

        // Kiểm tra số dư token
        const baseBalance = await connection.getTokenAccountBalance(baseATA.address);
        const quoteBalance = await connection.getTokenAccountBalance(quoteATA.address);
        console.log("USDC balance:", baseBalance.value.uiAmount ?? 0, "USDC");
        console.log("WSOL balance:", quoteBalance.value.uiAmount ?? 0, "WSOL");
        if ((baseBalance.value.uiAmount ?? 0) < 0.1) {
            throw new Error(`Insufficient USDC balance: ${baseBalance.value.uiAmount ?? 0} USDC`);
        }
        if ((quoteBalance.value.uiAmount ?? 0) < 0.1) {
            throw new Error(`Insufficient WSOL balance: ${quoteBalance.value.uiAmount ?? 0} WSOL`);
        }

        // Địa chỉ pool USDC/WSOL
        const pair = new PublicKey("72B8ciGYZGT9bPNC3xC4HFGK6m94CL4BRJQw8xXhnsFi");

        // Lấy thông tin on-chain của pool
        const pairInfo = await sarosDLMM.getPairAccount(pair);
        console.log("Pair info:", JSON.stringify(pairInfo, null, 2));
        const activeBin = pairInfo.activeId;
        console.log("Active bin:", activeBin);

        // Khởi tạo hàng đợi giao dịch
        const txQueue: Transaction[] = [];

        // Chuẩn bị bin và vault accounts
        const binsAndVaultsTx = new Transaction();
        const binRange: [number, number] = [activeBin - 5, activeBin + 5]; // Điều chỉnh binRange dựa trên activeBin
        console.log("Bin range:", binRange);
        const binArrayList = getMaxBinArray(binRange, activeBin);
        console.log("Bin array list:", JSON.stringify(binArrayList, null, 2));

        // Kiểm tra hoặc tạo bin arrays
        await Promise.all(
            binArrayList.map(async (bin) => {
                console.log(`Checking bin array lower: ${bin.binArrayLowerIndex}`);
                await sarosDLMM.getBinArray({
                    binArrayIndex: bin.binArrayLowerIndex,
                    pair,
                    payer: wallet.publicKey,
                    transaction: binsAndVaultsTx,
                });
                console.log(`Checking bin array upper: ${bin.binArrayUpperIndex}`);
                await sarosDLMM.getBinArray({
                    binArrayIndex: bin.binArrayUpperIndex,
                    pair,
                    payer: wallet.publicKey,
                    transaction: binsAndVaultsTx,
                });
            })
        );

        // Kiểm tra hoặc tạo vault accounts
        await Promise.all(
            [USDC_TOKEN_DEVNET, WSOL_TOKEN_DEVNET].map(async (token) => {
                console.log(`Checking pair vault for token: ${token.mintAddress}`);
                await sarosDLMM.getPairVaultInfo({
                    pair,
                    payer: wallet.publicKey,
                    transaction: binsAndVaultsTx,
                    tokenAddress: new PublicKey(token.mintAddress),
                });
                console.log(`Checking user vault for token: ${token.mintAddress}`);
                await sarosDLMM.getUserVaultInfo({
                    payer: wallet.publicKey,
                    transaction: binsAndVaultsTx,
                    tokenAddress: new PublicKey(token.mintAddress),
                });
            })
        );

        // Thêm binsAndVaultsTx vào hàng đợi nếu có instructions
        if (binsAndVaultsTx.instructions.length > 0) {
            console.log("Adding binsAndVaultsTx with", binsAndVaultsTx.instructions.length, "instructions");
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({
                commitment: "confirmed",
            });
            binsAndVaultsTx.recentBlockhash = blockhash;
            binsAndVaultsTx.feePayer = wallet.publicKey;
            binsAndVaultsTx.sign(wallet);
            txQueue.push(binsAndVaultsTx);
        }

        // Tạo vị thế người dùng
        const maxPositionList = getMaxPosition(binRange, activeBin);
        console.log("Max position list:", maxPositionList);
        const maxPositionPairs: [number, number][] = [];
        for (let i = 0; i < maxPositionList.length; i += 2) {
            const left = maxPositionList[i];
            const right = maxPositionList[i + 1];
            maxPositionPairs.push([left, right]);
        }
        console.log("Max position pairs:", maxPositionPairs);

        const userPositions = await sarosDLMM.getUserPositions({ payer: wallet.publicKey, pair });
        console.log("User positions:", JSON.stringify(userPositions, null, 2));

        const maxLiquidityDistribution = createUniformDistribution({ shape: LiquidityShape.Spot, binRange });
        console.log("Max liquidity distribution:", JSON.stringify(maxLiquidityDistribution, null, 2));

        const maxLiquidityDistributions = await Promise.all(
            maxPositionPairs.map(async (position: [number, number]) => {
                const [left, right] = position;
                console.log(`Processing position: [${left}, ${right}]`);
                const currentPosition = userPositions.find((p: any) =>
                    Number(p.relativeBinIdLeft) === left && Number(p.relativeBinIdRight) === right
                );

                const startIndex = maxLiquidityDistribution.findIndex((item) => item.relativeBinId === left) ?? 0;
                const endIndex = (maxLiquidityDistribution.findIndex((item) => item.relativeBinId === right) ?? maxLiquidityDistribution.length - 1) + 1;
                const liquidityDistribution = maxLiquidityDistribution.slice(startIndex, endIndex);
                console.log("Liquidity distribution for position:", JSON.stringify(liquidityDistribution, null, 2));

                const binArray = binArrayList.find(
                    (item) =>
                        item.binArrayLowerIndex * 256 <= left &&
                        (item.binArrayUpperIndex + 1) * 256 > right
                );
                if (!binArray) {
                    throw new Error(`No bin array found for position [${left}, ${right}]`);
                }

                const binArrayLower = await sarosDLMM.getBinArray({
                    binArrayIndex: binArray.binArrayLowerIndex,
                    pair,
                    payer: wallet.publicKey,
                });
                const binArrayUpper = await sarosDLMM.getBinArray({
                    binArrayIndex: binArray.binArrayUpperIndex,
                    pair,
                    payer: wallet.publicKey,
                });
                console.log("Bin array lower:", binArrayLower.toBase58());
                console.log("Bin array upper:", binArrayUpper.toBase58());

                let positionMint: PublicKey;
                if (!currentPosition) {
                    console.log("Creating new position...");
                    const createPositionTx = new Transaction();
                    const newPositionMint = Keypair.generate();

                    await sarosDLMM.createPosition({
                        pair,
                        payer: wallet.publicKey,
                        relativeBinIdLeft: position[0],
                        relativeBinIdRight: position[1],
                        binArrayIndex: binArray.binArrayLowerIndex,
                        positionMint: newPositionMint.publicKey,
                        transaction: createPositionTx,
                    });

                    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({
                        commitment: "confirmed",
                    });
                    createPositionTx.recentBlockhash = blockhash;
                    createPositionTx.feePayer = wallet.publicKey;
                    createPositionTx.sign(wallet, newPositionMint);
                    txQueue.push(createPositionTx);
                    positionMint = newPositionMint.publicKey;
                    console.log("New position mint:", positionMint.toBase58());
                } else {
                    positionMint = currentPosition.positionMint;
                    console.log("Using existing position mint:", positionMint.toBase58());
                }

                return {
                    positionMint,
                    position,
                    liquidityDistribution,
                    binArrayLower: binArrayLower.toBase58(),
                    binArrayUpper: binArrayUpper.toBase58(),
                };
            })
        );

        // Thêm thanh khoản vào vị thế
        await Promise.all(
            maxLiquidityDistributions.map(async (maxLiquidityDistribution) => {
                const { positionMint, liquidityDistribution, binArrayLower, binArrayUpper } = maxLiquidityDistribution;
                console.log("Adding liquidity to position:", positionMint.toBase58());

                const addLiquidityTx = new Transaction();

                // Tính số lượng token (0.1 USDC và 0.1 WSOL)
                const amountX = Number(
                    new bigDecimal(Math.pow(10, USDC_TOKEN_DEVNET.decimals))
                        .multiply(new bigDecimal(0.1))
                        .getValue()
                );
                const amountY = Number(
                    new bigDecimal(Math.pow(10, WSOL_TOKEN_DEVNET.decimals))
                        .multiply(new bigDecimal(0.1))
                        .getValue()
                );
                console.log("Amount X (USDC):", amountX);
                console.log("Amount Y (WSOL):", amountY);

                await sarosDLMM.addLiquidityIntoPosition({
                    amountX,
                    amountY,
                    positionMint,
                    liquidityDistribution,
                    binArrayLower: new PublicKey(binArrayLower),
                    binArrayUpper: new PublicKey(binArrayUpper),
                    transaction: addLiquidityTx,
                    payer: wallet.publicKey,
                    pair,
                });

                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({
                    commitment: "confirmed",
                });
                addLiquidityTx.recentBlockhash = blockhash;
                addLiquidityTx.feePayer = wallet.publicKey;
                addLiquidityTx.sign(wallet);
                txQueue.push(addLiquidityTx);
            })
        );

        // Gửi tất cả giao dịch trong hàng đợi
        console.log("Sending", txQueue.length, "transactions...");
        for (const tx of txQueue) {
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({
                commitment: "confirmed",
            });
            tx.recentBlockhash = blockhash;
            // Ký lại giao dịch nếu cần
            if (tx.signatures.length > 0) {
                tx.signatures = []; // Xóa chữ ký cũ
                tx.sign(wallet); // Ký lại với wallet
            }
            const signature = await connection.sendRawTransaction(tx.serialize(), {
                skipPreflight: false,
                preflightCommitment: "confirmed",
            });
            console.log("Transaction signature:", signature);

            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight,
            }, "confirmed");

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${confirmation.value.err}`);
            }
        }

        // Kiểm tra số dư sau khi thêm thanh khoản
        const postBaseBalance = await connection.getTokenAccountBalance(baseATA.address);
        const postQuoteBalance = await connection.getTokenAccountBalance(quoteATA.address);
        console.log("Post-liquidity USDC balance:", postBaseBalance.value.uiAmount ?? 0, "USDC");
        console.log("Post-liquidity WSOL balance:", postQuoteBalance.value.uiAmount ?? 0, "WSOL");

        // Kiểm tra lại vị thế
        const postUserPositions = await sarosDLMM.getUserPositions({ payer: wallet.publicKey, pair });
        console.log("Post-liquidity user positions:", JSON.stringify(postUserPositions, null, 2));

        console.log("Liquidity added successfully to pool:", pair.toBase58());
        return { pair, txQueue };
    } catch (err) {
        console.error("Error adding liquidity:", err);
        throw err;
    }
}

// Chạy hàm
addLiquidity().catch(console.error);