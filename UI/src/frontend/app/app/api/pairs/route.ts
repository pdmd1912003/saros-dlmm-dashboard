import { NextResponse } from "next/server"
import { findWalletPositions } from "@/backend/service/poolService"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get("wallet")

  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet address" }, { status: 400 })
  }

  try {
    const positions = await findWalletPositions(wallet)

    if (!positions || positions.length === 0) {
      return NextResponse.json({ pairs: [] })
    }

    const pairsMap = new Map<string, any>()
    for (const pos of positions) {
      const pair = pos.pair || pos.pool_address
      if (!pair) continue

      if (!pairsMap.has(pair)) {
        pairsMap.set(pair, {
          pair,
          poolAddress: pos.pool_address,
          positionsCount: 1,
        })
      } else {
        const existing = pairsMap.get(pair)
        existing.positionsCount += 1
        pairsMap.set(pair, existing)
      }
    }

    const pairs = Array.from(pairsMap.values())

    return NextResponse.json({ pairs })
  } catch (err: any) {
    console.error("API /pairs error:", err)
    return NextResponse.json({ error: "Failed to fetch pairs" }, { status: 500 })
  }
}
