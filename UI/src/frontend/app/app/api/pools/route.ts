// app/api/pools/route.ts
import { NextResponse } from "next/server";
import db from "@/backend/server/db";

export async function GET(req: Request) {
  try {
    const result = await db.query(
      `SELECT pool_address, token_base, token_quote, metadata, updated_at
       FROM pools
       ORDER BY updated_at DESC
       LIMIT 10`
    );

    const pools = result.rows.map((row) => {
      const meta = row.metadata || {};
      return {
        address: row.pool_address,  
        pair: `${row.token_base}/${row.token_quote}`,
        tradeFee: meta.tradeFee || 0,
        baseMint: row.token_base,
        baseReserve: meta.baseReserve || 0,
        quoteMint: row.token_quote,
        quoteReserve: meta.quoteReserve || 0,
      };
    });

    return NextResponse.json({ pools });
  } catch (err: any) {
    console.error("API /pools error:", err);
    return NextResponse.json(
      { error: "Failed to load pools" },
      { status: 500 }
    );
  }
}
