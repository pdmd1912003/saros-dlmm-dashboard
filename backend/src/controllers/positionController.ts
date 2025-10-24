import { Request, Response } from "express"
import { getWalletPools, findWalletPositions, getPositionsByPool } from "../service/saros/poolService"

// -----------------------------
// 🧩 GET /api/positions/pools?wallet=xxx
// -----------------------------
export async function getWalletPoolsController(req: Request, res: Response) {
  const wallet = req.query.wallet as string

  if (!wallet || wallet.length < 32)
    return res.status(400).json({ error: "Invalid wallet address" })

  try {
    const positions = await getWalletPools(wallet)

    if (!positions.length) {
      await findWalletPositions(wallet)
      const newPositions = await getWalletPools(wallet)
      return res.json({ pools: summarizePools(newPositions) })
    }
    const pools = summarizePools(positions)
    return res.json({ pools })
  } catch (err: any) {
    console.error("❌ Error in getWalletPoolsController:", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}

function summarizePools(positions: any[]) {
  const map = new Map()

  for (const pos of positions) {
    if (!map.has(pos.pool_address)) {
      map.set(pos.pool_address, {
        poolAddress: pos.pool_address,
        tokenBase: pos.token_base,
        tokenQuote: pos.token_quote,
        positionsCount: 1,
        
      })
    } else {
      const existing = map.get(pos.pool_address)
      existing.positionsCount++
      map.set(pos.pool_address, existing)
    }
  }

  return Array.from(map.values())
}

// -----------------------------
// 🧩 GET /api/positions/:poolAddress?wallet=xxx
// -----------------------------
export async function getWalletPositionsByPool(req: Request, res: Response) {
  const wallet = req.query.wallet as string
  const { poolAddress } = req.params

  if (!wallet || wallet.length < 32)
    return res.status(400).json({ error: "Invalid wallet address" })

  try {
    let positions = await getPositionsByPool(wallet, poolAddress)

    if (!positions.length) {
      await findWalletPositions(wallet)
      positions = await getPositionsByPool(wallet, poolAddress)
    }

    return res.json({ positions })
  } catch (err: any) {
    console.error("❌ Error in getWalletPositionsByPool:", err.message)
    return res.status(500).json({ error: "Internal server error" })
  }
}
