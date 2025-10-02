import "dotenv/config";
import db from "../server/db"; // tương đối với project
import { sarosDLMM ,fetchPoolMetadata} from "../service/sarosService"; // điều chỉnh path nếu cần

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function upsertPool(address: string, metadata: any) {
  const sql =
    `INSERT INTO pools (address, metadata, token_base, token_quote)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE metadata = VALUES(metadata), updated_at = NOW()`;
  const tokenBase = metadata?.baseMint ?? null;
  const tokenQuote = metadata?.quoteMint ?? null;
  const metaStr = metadata ? JSON.stringify(metadata) : null;
  await db.execute(sql, [address, metaStr, tokenBase, tokenQuote]);
}

async function main() {
  console.log("Fetching pool addresses from sarosDLMM...");
  // SDK may return strings or PublicKey-like objects; accept either shape
  const addresses = await sarosDLMM.fetchPoolAddresses() as Array<string | { toBase58: () => string }>;

  console.log("Total pools:", addresses.length);
  const BATCH = 8; // đồng thời 8 metadata requests
  const DELAY_BETWEEN_BATCHES = 400; // ms

  for (let i = 0; i < addresses.length; i += BATCH) {
    const batch = addresses.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (addr) => {
        try {
          const addrStr = typeof addr === "string" ? addr : addr.toBase58();
          const metadata = await fetchPoolMetadata(addrStr);
          await upsertPool(addrStr, metadata);
          console.log("Saved pool", addrStr);
        } catch (e: unknown) {
          if (e instanceof Error) {
            console.error("Failed fetch/insert for pool:", addr, e.message);
          } else {
            console.error("Failed fetch/insert for pool:", addr, e);
          }
        }
      })
    );
    // chờ 1 chút để tránh rate-limit
    await sleep(DELAY_BETWEEN_BATCHES);
  }

  console.log("Seeding pools finished.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
