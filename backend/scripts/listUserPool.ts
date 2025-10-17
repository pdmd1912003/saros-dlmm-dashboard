import "dotenv/config";
//@ts-ignore
import Big from "big.js";
import db from "../server/db";
import { dlmmClient } from "../service/client";
import { PublicKey } from "@solana/web3.js";

interface Pool {
  id: number;
  pool_address: string;
  token_base: string;
  token_quote: string;
  base_reserve: string;
  quote_reserve: string;
  trade_fee: string;
  token_base_decimal: number;
  token_quote_decimal: number;
}

interface Position {
  id: number;
  position_address: string;
  wallet_id: number;
  pool_id: number;
  lower_bin_id: number;
  upper_bin_id: number;
  liquidity_shares: number[];
  liquidity_amount: string;
  token_base_amount: string;
  token_quote_amount: string;
}

async function analyzeWallet(walletAddress: string) {
  console.log(`🔍 Analyzing wallet: ${walletAddress}`);

  // --- 1️⃣ Tìm wallet_id trong DB ---
  const { rows: walletRows } = await db.query(
    `SELECT id FROM wallets WHERE owner_address = $1 LIMIT 1`,
    [walletAddress]
  );
  if (walletRows.length === 0) {
    console.error("❌ Wallet chưa có trong DB");
    return;
  }
  const walletId = walletRows[0].id;

  // --- 2️⃣ Lấy tất cả positions ---
  const { rows: positions } = await db.query<Position>(
    `SELECT * FROM position WHERE wallet_id = $1`,
    [walletId]
  );
  if (positions.length === 0) {
    console.log("⚠️ Wallet này chưa có position nào.");
    return;
  }

  console.log(`📊 Found ${positions.length} positions.\n`);

  for (const position of positions) {
    console.log(`==============================`);
    console.log(`📘 Position: ${position.position_address}`);

    const { rows: poolRows } = await db.query<Pool>(
      `SELECT * FROM pools WHERE id = $1 LIMIT 1`,
      [position.pool_id]
    );
    if (poolRows.length === 0) {
      console.warn("⚠️ Không tìm thấy pool trong DB");
      continue;
    }
    const pool = poolRows[0];

    const pairAccount = await dlmmClient.getLbPair(new PublicKey(pool.pool_address));
    const activeId = pairAccount?.activeId;
    const binStep = pairAccount?.binStep;
    const stepRatio = new Big(1).plus(new Big(binStep || 0).div(10000));

    const baseReserve = new Big(pool.base_reserve);
    const quoteReserve = new Big(pool.quote_reserve);
    const currentPrice = quoteReserve.div(baseReserve);

    console.log(`Pool: ${pool.pool_address}`);
    console.log(`Bin range: ${position.lower_bin_id} → ${position.upper_bin_id}`);
    console.log(`Active bin: ${activeId}`);
    console.log(`Current Price: ${currentPrice.toFixed(9)}\n`);

    const liquidityShares = position.liquidity_shares || [];
    let totalLiquidity = Big(0);
    for (let i = 0; i < liquidityShares.length; i++) {
      totalLiquidity = totalLiquidity.plus(liquidityShares[i] || 0);
    }

    console.log(`💧 Total Liquidity: ${totalLiquidity.toFixed(0)}`);
    console.log(`Base Amt: ${position.token_base_amount}`);
    console.log(`Quote Amt: ${position.token_quote_amount}\n`);
  }
}

/**
 * 🚀 Run CLI
 */
const walletAddress = process.argv[2];
if (!walletAddress) {
  console.error("⚠️ Usage: npx tsx backend/scripts/analyzePosition.ts <wallet_address>");
  process.exit(1);
}

analyzeWallet(walletAddress)
  .then(() => db.end())
  .catch((err) => {
    console.error("❌ Error:", err);
    db.end();
  });
