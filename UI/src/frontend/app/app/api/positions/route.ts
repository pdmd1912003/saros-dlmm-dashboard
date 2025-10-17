import { NextResponse } from "next/server"
import { findWalletPositions } from "@/backend/service/poolService"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get("wallet")

  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet address" }, { status: 400 })
  }

  try {
    const positions = await findWalletPositions(wallet);
    return NextResponse.json({ positions })
  } catch (err: any) {
    console.error("API /positions error:", err)
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 })
  }
}
