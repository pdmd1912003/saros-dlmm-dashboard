import { PublicKey } from "@solana/web3.js";
import db from "../server/db";

// ------------------ Giải mã hex -> số (chuẩn hóa Q64.64) ------------------
function decodeLiquidityShares(hexArray: string[]): number[] {
  const SCALE = 2 ** 64; // Fixed-point scale used in DLMM
  return hexArray.map((v) => {
    if (!v || v === "00") return 0;
    try {
      const bigint = BigInt("0x" + v);
      // chuyển về số thực (chia cho 2^64)
      return Number(bigint) / SCALE;
    } catch {
      return 0;
    }
  });
}

// ------------------ Tính giá từng bin ------------------
function calcBinPrices(
  basePrice: number,
  activeBinId: number,
  lowerBinId: number,
  shares: number[],
  binStep: number
) {
  const prices: { binId: number; price: number; liquidity: number }[] = [];

  for (let i = 0; i < shares.length; i++) {
    const binId = lowerBinId + i;
    const price = basePrice * Math.pow(1 + binStep, binId - activeBinId);
    prices.push({ binId, price, liquidity: shares[i] });
  }

  return prices;
}

// ------------------ Truy vấn DB ------------------
async function getUserPositions(wallet: string) {
  const result = await db.query(
    `SELECT positions FROM user_positions WHERE wallet = $1 ORDER BY fetched_at DESC LIMIT 1`,
    [wallet]
  );
  if (result.rows.length === 0) {
    console.warn("⚠️ Không tìm thấy position cho ví:", wallet);
    return [];
  }
  return result.rows[0].positions;
}

async function getPoolInfo(poolAddress: string) {
  const result = await db.query(
    `SELECT metadata FROM pools WHERE pool_address = $1 LIMIT 1`,
    [poolAddress]
  );
  if (result.rows.length === 0) {
    console.warn(`⚠️ Pool ${poolAddress} chưa có trong database.`);
    return { activeBinId: 0, currentPrice: 1, binStep: 0.0001 };
  }
  const meta = result.rows[0].metadata;
  return {
    activeBinId: meta.activeBinId ?? 0,
    currentPrice: meta.currentPrice ?? 1,
    binStep: meta.binStep ?? meta.bin_step ?? 0.0001,
  };
}

// ------------------ Tính toán phân phối ------------------
async function calculatePositionDistribution(wallet: string) {
  console.log("📥 Lấy position từ database cho ví:", wallet);
  const positions = await getUserPositions(wallet);

  if (!positions || positions.length === 0) {
    console.log("❌ Ví này chưa có position nào được lưu.");
    return;
  }

  console.log(`✅ Đã lấy ${positions.length} position(s) từ DB.`);

  const results: any[] = [];

  for (const pos of positions) {
    const poolAddressRaw = pos.pool_address || pos.poolAddress;
    if (!poolAddressRaw) {
      console.warn("⚠️ Bỏ qua position vì thiếu pool_address:", pos);
      continue;
    }

    let poolAddr: string;
    try {
      poolAddr = new PublicKey(poolAddressRaw).toBase58();
    } catch {
      console.warn("⚠️ Bỏ qua vì poolAddress không hợp lệ:", poolAddressRaw);
      continue;
    }

    const metadata = await getPoolInfo(poolAddr);
    const activeBinId = 8385181;
    // const activeBinId = metadata.activeBinId;
    
    const basePrice = metadata.currentPrice;
    const binStep = metadata.binStep;

    const lowerBinId = pos.lowerBinId ?? pos.lower_bin_id ?? 0;
    const decodedShares = decodeLiquidityShares(
      pos.liquidityShares || pos.liquidity_shares || []
    );

    const bins = calcBinPrices(
      basePrice,
      activeBinId,
      lowerBinId,
      decodedShares,
      binStep
    );
    const totalLiquidity = decodedShares.reduce((a, b) => a + b, 0);

    const summary = {
      pool: poolAddr,
      positionMint: pos.positionMint || pos.position_mint,
      lowerBinId,
      upperBinId: pos.upperBinId || pos.upper_bin_id,
      basePrice,
      activeBinId,
      binStep,
      totalLiquidity,
      nonZeroBins: bins.filter((b) => b.liquidity > 0).length,
      bins: bins
        .filter((b) => b.liquidity > 0)
        .map((b) => ({
          binId: b.binId,
          price: Number(b.price.toFixed(8)),
          liquidity: Number(b.liquidity.toFixed(6)),
        })),
    };

    results.push(summary);
  }

  return results;
}

// ------------------ MAIN ------------------
(async () => {
  const wallet = "6uPpzrCcMRa81GA9Zdi4fD6VXHDgsxbNMT7szL3TPELu";
  console.log("🚀 Bắt đầu tính toán phân phối liquidity...");
  console.log("🔑 Ví test:", wallet);
  console.log("───────────────────────────────");

  try {
    const result = await calculatePositionDistribution(wallet);
    console.dir(result, { depth: null });
  } catch (err) {
    console.error("🚨 Lỗi khi tính toán:", err);
  } finally {
    await db.end();
    console.log("🧹 Đã đóng kết nối database.");
  }
})();
