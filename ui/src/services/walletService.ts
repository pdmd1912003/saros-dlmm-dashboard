import axios from "axios";

const API_BASE_URL = "http://localhost:3000";

export async function getWalletPositions(walletAddress: string) {
  if (!walletAddress) {
    throw new Error("Wallet address is required");
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/wallet/${walletAddress}/positions`);
    return response.data.positions; // ✅ backend trả về { success, positions }
  } catch (error: any) {
    console.error("❌ Failed to fetch wallet positions:", error);
    throw new Error(error.response?.data?.error || "Failed to fetch wallet positions");
  }
}
