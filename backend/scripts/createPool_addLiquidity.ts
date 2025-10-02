import "dotenv/config";
import { Keypair, PublicKey, Connection, Transaction } from "@solana/web3.js";
import { LiquidityBookServices, MODE, BIN_STEP_CONFIGS } from "@saros-finance/dlmm-sdk";
import { getOrCreateAssociatedTokenAccount, getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { USDC_TOKEN_DEVNET, wallet, WSOL_TOKEN_DEVNET } from "../../utils/config";
import { sarosDLMM } from "../services/sarosService";

async function createLiquidityPair() {
    try {
        // Kiểm tra connection
        const connection = sarosDLMM.connection;
        if (!connection) {
            throw new Error("Connection is not initialized");
        }

        // Kiểm tra số dư ví
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

        // Kiểm tra binStep (sử dụng binStep khác để tạo pool mới)
        const binStep = BIN_STEP_CONFIGS[2]?.binStep || 5; // Sử dụng binStep khác (ví dụ: 5) để tránh trùng PDA
        console.log("Bin step:", binStep);

        // Giá khởi tạo (dựa trên giá thị trường USDC/WSOL, ví dụ: 1 USDC = 0.03 WSOL)
        const ratePrice = 0.03; // TODO: Lấy giá thực tế từ oracle (Pyth, Chainlink, hoặc AMM như Orca)
        console.log("Rate price:", ratePrice, "WSOL/USDC");

        // Lấy blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({
            commitment: "confirmed",    
        });

        // Tạo cặp thanh khoản
        const { tx, pair } = await sarosDLMM.createPairWithConfig({
            tokenBase: {
                mintAddress: USDC_TOKEN_DEVNET.mintAddress,
                decimal: USDC_TOKEN_DEVNET.decimals,
            },
            tokenQuote: {
                mintAddress: WSOL_TOKEN_DEVNET.mintAddress,
                decimal: WSOL_TOKEN_DEVNET.decimals,
            },
            binStep,
            ratePrice,
            payer: wallet.publicKey,
        });

        // Cập nhật giao dịch
        tx.recentBlockhash = blockhash;
        tx.feePayer = wallet.publicKey;

        // Ký giao dịch
        tx.sign(wallet);

        // Gửi và xác nhận giao dịch
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
            console.error("Transaction details:", await connection.getTransaction(signature, { commitment: "confirmed" }));
            throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }

        console.log("Liquidity pair created successfully!");
         const pairPub: PublicKey = typeof pair === "string" ? new PublicKey(pair) : pair;
        console.log("Pair address:", pairPub);

        // Kiểm tra thông tin pool sau khi tạo
        const pairInfo = await sarosDLMM.getPairAccount(pairPub);
        console.log("Pair info:", JSON.stringify(pairInfo, null, 2));

        return { pair, signature };
    } catch (err) {
        console.error("Error creating liquidity pair:", err);
        throw err;
    }
}

// Chạy hàm
createLiquidityPair().catch(console.error);