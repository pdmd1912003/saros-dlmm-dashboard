import { NextApiRequest, NextApiResponse } from "next";
import { PublicKey } from "@solana/web3.js";
import db from "../server/db"; // Adjust path as needed
import { sarosDLMM } from "../service/sarosService"; // Adjust path as needed

// Helper to format addresses (consistent with frontend)
const formatAddress = (addr: any): string => {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  if (addr instanceof PublicKey) return addr.toBase58();
  if (addr.toBase58) return addr.toBase58();
  return String(addr);
};

async function upsertPositions(wallet: string, positions: any[]) {
  const sql = `
    INSERT INTO user_positions (wallet, positions, fetched_at)
    VALUES (?, ?, NOW())
    ON DUPLICATE KEY UPDATE positions = VALUES(positions), fetched_at = NOW()
  `;
  const positionsStr = positions ? JSON.stringify(positions) : null;
  await db.execute(sql, [wallet, positionsStr]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { walletAddr } = req.body;

  if (!walletAddr || typeof walletAddr !== "string") {
    return res.status(400).json({ error: "Valid wallet address is required" });
  }

  try {
    // Fetch all pool addresses from the database
    const [rows] = await db.execute("SELECT address FROM pools");
    const poolAddresses = (rows as any[]).map((row) => row.address);

    if (!poolAddresses.length) {
      return res.status(200).json({ positions: [] });
    }

    const positions: any[] = [];
    const BATCH = 8; // Process 8 pools at a time
    const DELAY_BETWEEN_BATCHES = 400; // ms to avoid rate limits

    // Helper to sleep between batches
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Iterate through pool addresses in batches
    for (let i = 0; i < poolAddresses.length; i += BATCH) {
      const batch = poolAddresses.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (poolAddress: string) => {
          try {
            const walletPublicKey = new PublicKey(walletAddr);
            const poolPublicKey = new PublicKey(poolAddress);
            const userPositions = await sarosDLMM.getUserPositions({
              payer: walletPublicKey,
              pair: poolPublicKey,
            });

            if (userPositions.length > 0) {
              // Format positions for storage and response
              const formattedPositions = userPositions.map((pos: any) => ({
                poolAddress: formatAddress(poolAddress),
                positionMint: formatAddress(pos.positionMint),
                liquidityShares: pos.liquidityShares,
                lowerBinId: pos.lowerBinId,
                upperBinId: pos.upperBinId,
              }));
              positions.push(...formattedPositions);
            }
          } catch (err: unknown) {
            console.error(`Error fetching positions for pool ${poolAddress}:`, err);
          }
        })
      );
      await sleep(DELAY_BETWEEN_BATCHES); // Avoid rate limits
    }

    // Upsert positions into the database
    await upsertPositions(walletAddr, positions);

    // Return the fetched positions
    return res.status(200).json({ positions });
  } catch (err: unknown) {
    console.error("Error in /api/portfolio:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}