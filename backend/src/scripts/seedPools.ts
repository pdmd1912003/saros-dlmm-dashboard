import "dotenv/config";
import { PublicKey } from "@solana/web3.js";
import { dlmmClient } from "../service/client"; // ✅ đã setup DLMMClient
import db from "../server/db"; // ✅ kết nối PostgreSQL (qua pg hoặc prisma)
import { fetchPoolMetadata } from "../service/saros-service/sarosService";

async function savePoolToDB(metadata: any) {
  const {
    poolAddress,
    baseMint,
    quoteMint,
    baseReserve,
    quoteReserve,
    tradeFee,
    extra
  } = metadata;

  const tokenBaseDecimal = extra?.tokenBaseDecimal || 0;
  const tokenQuoteDecimal = extra?.tokenQuoteDecimal || 0;

  const query = `
    INSERT INTO pools (
      pool_address, token_base, token_quote, base_reserve, quote_reserve,
      trade_fee, token_base_decimal, token_quote_decimal
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (pool_address)
    DO UPDATE SET
    token_base = EXCLUDED.token_base,
    token_quote = EXCLUDED.token_quote,
    base_reserve = EXCLUDED.base_reserve,
    quote_reserve = EXCLUDED.quote_reserve,
    trade_fee = EXCLUDED.trade_fee,
    token_base_decimal = EXCLUDED.token_base_decimal,
    token_quote_decimal = EXCLUDED.token_quote_decimal;
  `;

  await db.query(query, [
    poolAddress,
    baseMint,
    quoteMint,
    baseReserve,
    quoteReserve,
    tradeFee,
    tokenBaseDecimal,
    tokenQuoteDecimal
  ]);
}

async function main() {
  console.log("🔍 Fetching all DLMM pools...");
  const allPairs = await dlmmClient.getAllLbPairs();

  console.log(`✅ Found ${allPairs.length} pools. Fetching metadata...`);

  for (const pair of allPairs) {
    try {
      const metadata = await fetchPoolMetadata(pair.poolAddress);
      console.log("Pool metadata:", metadata);

      await savePoolToDB(metadata);
      console.log(`💾 Saved pool ${metadata.poolAddress}`);
    } catch (err) {
      console.error(`❌ Error saving pool ${pair.poolAddress}:`, err);
    }
  }

  console.log("🎉 All pools saved successfully!");
}

main().catch(console.error);
