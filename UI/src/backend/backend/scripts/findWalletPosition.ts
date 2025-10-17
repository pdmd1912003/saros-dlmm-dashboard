import "dotenv/config";
import { findWalletPositions } from "../service/poolService"; // ⚠️ Đường dẫn đúng
import db from "../server/db";

async function main() {
  try {
    // 🧠 Ví test có LP
    const walletAddress = "5ufkqiemfB2TrJ7pVXEaGjGP9ArXdCNgbsccLLrSvqZA";

    console.log("🚀 Bắt đầu kiểm tra findWalletPositions...");
    console.log("🔑 Ví:", walletAddress);

    // ✅ Gọi hàm lấy dữ liệu vị thế
    const positions = await findWalletPositions(walletAddress);

    // ⚙️ Kiểm tra dữ liệu trả về
    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      console.log("⚠️ Không tìm thấy vị thế nào cho ví này.");
    } else {
      console.log(`✅ Tìm thấy ${positions.length} vị thế:`);

      // 🔍 Hiển thị thông tin chi tiết từng position
      for (const pos of positions) {
        console.log(`
📘 Position Address: ${pos.position_address}
📍 Pool Address:     ${pos.pool_address}
⬇️ Lower Bin ID:     ${pos.lower_bin_id}
⬆️ Upper Bin ID:     ${pos.upper_bin_id}
💧 Liquidity Amount: ${Number(pos.liquidity_amount || 0).toLocaleString()}
🪙 Base Amount:      ${Number(pos.token_base_amount || 0).toLocaleString()}
💵 Quote Amount:     ${Number(pos.token_quote_amount || 0).toLocaleString()}
──────────────────────────────────────────────`);
      }
    }

  } catch (err: any) {
    console.error("❌ Lỗi khi test findWalletPositions:", err.message || err);
  } finally {
    // 🔌 Đóng kết nối database sau khi xong
    await db.end();
    console.log("🧹 Đã đóng kết nối database.");
  }
}

// Chạy script
main();
