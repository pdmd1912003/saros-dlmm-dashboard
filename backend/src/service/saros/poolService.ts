import { PublicKey } from "@solana/web3.js";
import { dlmmClient } from "../../sdk/client";
import db from "../../config/db";
import { sleep, decodeBNArray, withRetry } from "./utils";



// -----------------------------
// 🧩 Fetch all pools from DB
// -----------------------------
export async function getAllPoolsFromDB() {
  const res = await db.query(`SELECT * FROM pools`);
  return res.rows;
}

// -----------------------------
// 🧮 Safe decode BN -> number[]
// -----------------------------


// -----------------------------
// 📘 Get all pools (from DB) that a wallet has positions in
// -----------------------------
export async function getWalletPools(walletAddress: string) {
 const query = `
    SELECT
      p.id AS pool_id,
      p.pool_address,
      p.token_base,
      p.token_quote,
      p.token_base_decimal,
      p.token_quote_decimal,
      p.trade_fee,
      p.base_reserve,
      p.quote_reserve,
      pos.id AS position_id,
      pos.position_address,
      pos.lower_bin_id,
      pos.upper_bin_id,
      pos.liquidity_shape,
      pos.liquidity_shares,
      pos.liquidity_amount,
      pos.token_base_amount,
      pos.token_quote_amount,
      pos.is_active,
      w.id AS wallet_id,
      w.owner_address,
      w.nickname
    FROM position pos
    JOIN pools p ON pos.pool_id = p.id
    JOIN wallets w ON pos.wallet_id = w.id
    WHERE w.owner_address = $1
    ORDER BY p.created_at DESC;
  `;

  const result = await db.query(query, [walletAddress])
  return result.rows
}

async function getWalletId(walletAddr: string): Promise<number> {
  const res = await db.query(`SELECT id FROM wallets WHERE owner_address = $1`, [walletAddr]);
  if (res.rows.length > 0) return res.rows[0].id;

  const insert = await db.query(
    `INSERT INTO wallets (owner_address, created_at, updated_at)
     VALUES ($1, NOW(), NOW()) RETURNING id`,
    [walletAddr]
  );
  return insert.rows[0].id;
}

// -----------------------------
// 🔍 Sync and fetch all positions for a wallet
// -----------------------------
export async function findWalletPositions(walletAddr: string) {
  const payer = new PublicKey(walletAddr);
  const walletId = await getWalletId(walletAddr);

  console.log(`⚙️ Fetching positions for wallet ${walletAddr} ...`);

  // 1️⃣ Try to load existing positions from DB
  const existingPositions = await db.query(
    `
    SELECT pos.*, po.pool_address
    FROM position pos
    JOIN pools po ON pos.pool_id = po.id
    WHERE pos.wallet_id = $1
    `,
    [walletId]
  );

  if (existingPositions.rows.length > 0) {
    console.log(`✅ Found ${existingPositions.rows.length} existing positions in database.`);
    return existingPositions.rows;
  }

  // 2️⃣ Otherwise fetch on-chain via DLMM SDK
  console.log(`⚙️ No existing positions found. Fetching from SDK...`);

  const pools = await getAllPoolsFromDB();
  if (!pools.length) {
    console.warn("⚠️ No pools found in database.");
    return [];
  }

  const savedPositions: any[] = [];

  for (const pool of pools) {
    const poolAddress = pool.pool_address;
    const poolId = pool.id;

    try {
      // ✅ Use retry wrapper here
      const userPositions = await withRetry(
        () => dlmmClient.getUserPositions(payer, new PublicKey(poolAddress))
      );

      if (!userPositions.length) continue;

      for (const pos of userPositions) {
        const positionAddr = pos.position?.toString();
        const lowerBinId = pos.lowerBinId ?? 0;
        const upperBinId = pos.upperBinId ?? 0;

        const liquidityShares = decodeBNArray(pos.liquidityShares);
        const liquidityAmount = liquidityShares.reduce((a, b) => a + b, 0);

        let tokenBaseAmount = 0;
        let tokenQuoteAmount = 0;

        try {
          // ✅ Retry when fetching reserves too
          const reserves = await withRetry(() =>
            dlmmClient.getLiquidityBookServices().getBinsReserveInformation({
              payer,
              position: new PublicKey(positionAddr),
              pair: new PublicKey(poolAddress),
            })
          );

          if (Array.isArray(reserves)) {
            for (const r of reserves) {
              const liquidityShare = Number(r.liquidityShare?.toString() || 0);
              const totalSupply = Number(r.totalSupply || 1);
              const ratio = totalSupply > 0 ? liquidityShare / totalSupply : 0;

              tokenBaseAmount += Number(r.reserveX || 0) * ratio;
              tokenQuoteAmount += Number(r.reserveY || 0) * ratio;
            }
          }
        } catch (e: any) {
          console.warn(`⚠️ Unable to fetch reserves for position ${positionAddr}: ${e.message}`);
        }

        // 💾 Insert or update position in DB
        await db.query(
          `
          INSERT INTO position (
            position_address, wallet_id, pool_id,
            lower_bin_id, upper_bin_id,
            liquidity_shares, liquidity_amount,
            token_base_amount, token_quote_amount,
            is_active, created_at, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,NOW(),NOW())
          ON CONFLICT (position_address) DO UPDATE SET
            liquidity_shares = EXCLUDED.liquidity_shares,
            liquidity_amount = EXCLUDED.liquidity_amount,
            token_base_amount = EXCLUDED.token_base_amount,
            token_quote_amount = EXCLUDED.token_quote_amount,
            updated_at = NOW();
          `,
          [
            positionAddr,
            walletId,
            poolId,
            lowerBinId,
            upperBinId,
            liquidityShares,
            liquidityAmount,
            tokenBaseAmount,
            tokenQuoteAmount,
          ]
        );

        savedPositions.push({
          position_address: positionAddr,
          pool_address: poolAddress,
          token_base_amount: tokenBaseAmount,
          token_quote_amount: tokenQuoteAmount,
          lower_bin_id: lowerBinId,
          upper_bin_id: upperBinId,
        });
      }

      console.log(`💾 Saved ${userPositions.length} positions from pool ${poolAddress}`);
    } catch (err: any) {
      console.warn(`⚠️ Error fetching positions for pool ${poolAddress}: ${err.message}`);
    }

    // Delay nhẹ giữa mỗi pool để giảm tải RPC
    await sleep(1000);
  }

  console.log(`🎉 Done saving all positions for ${walletAddr}`);
  return savedPositions;
}

// -----------------------------
// 🔎 Get all positions for a wallet in a specific pool (DB)
// -----------------------------
export async function getPositionsByPool(walletAddr: string, poolAddress: string) {
  const query = `
    SELECT pos.*, p.token_base, p.token_quote
    FROM position pos
    JOIN pools p ON pos.pool_id = p.id
    JOIN wallets w ON pos.wallet_id = w.id
    WHERE w.owner_address = $1
    AND p.pool_address = $2
    ORDER BY pos.created_at DESC
  `

  const result = await db.query(query, [walletAddr, poolAddress])
  return result.rows
}