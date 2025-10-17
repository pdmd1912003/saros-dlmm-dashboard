import { PublicKey } from "@solana/web3.js";
import { dlmmClient } from "../service/client";
import db from "../server/db";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getAllPoolsFromDB() {
  const res = await db.query(`SELECT id, pool_address FROM pools`);
  return res.rows;
}

function decodeBNArray(arr: any[]): number[] {
  return arr.map((v) => {
    try {
      return typeof v === "object" && "toString" in v ? Number(BigInt(v.toString())) : Number(v);
    } catch {
      return 0;
    }
  });
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

export async function findWalletPositions(walletAddr: string) {
  const payer = new PublicKey(walletAddr);
  const walletId = await getWalletId(walletAddr);

  console.log(`⚙️ Fetching positions for wallet ${walletAddr} ...`);

  // 🔍 1️⃣ Kiểm tra xem đã có positions nào trong DB chưa
  const existingPositions = await db.query(
    `SELECT p.*, po.pool_address 
     FROM position p
     JOIN pools po ON p.pool_id = po.id
     WHERE p.wallet_id = $1`,
    [walletId]
  );

  if (existingPositions.rows.length > 0) {
    console.log(`✅ Found ${existingPositions.rows.length} existing positions in database.`);
    return existingPositions.rows;
  }

  // 🔹 2️⃣ Nếu có thì fetch từ SDK
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
      const userPositions = await dlmmClient.getUserPositions(payer, new PublicKey(poolAddress));
      if (!userPositions.length) continue;

      for (const pos of userPositions) {
        const positionAddr = pos.position?.toString();
        const lowerBinId = pos.lowerBinId ?? 0;
        const upperBinId = pos.upperBinId ?? 0;

        // decode liquidity shares from BN[]
        const liquidityShares = decodeBNArray(pos.liquidityShares);
        const liquidityAmount = liquidityShares.reduce((a, b) => a + b, 0);

        // 🧮 Fetch token reserves
        let tokenBaseAmount = 0;
        let tokenQuoteAmount = 0;
        try {
          const reserves = await dlmmClient
            .getLiquidityBookServices()
            .getBinsReserveInformation({
              payer,
              position: new PublicKey(positionAddr),
              pair: new PublicKey(poolAddress),
            });

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

        // 💾 Insert or update DB
        await db.query(
          `INSERT INTO position (
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
            updated_at = NOW();`,
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
      console.warn(`⚠️ Error fetching positions for pool ${poolAddress}:`, err.message);
    }

    await sleep(1500);
  }

  console.log(`🎉 Done saving all positions for ${walletAddr}`);
  return savedPositions;
}
