import "dotenv/config";
import db from "../server/db";
import { sarosDLMM, fetchPoolMetadata } from "../service/sarosService";

const walletAddress = "CvyUnap7qHnHw2myjg5xhHkuQaSmaq7THfPKnJhRiYgv";

const fetchBinPositions = async (userId: string, pairId?: string) => {
  const baseUrl = "https://api.saros.finance/dlmm";
  const params = new URLSearchParams({
    user_id: userId,
    page_num: "1",
    page_size: "100",
  });

  if (pairId) {
    params.append("pair_id", pairId);
  }

  const response = await fetch(`${baseUrl}/api/bin-position?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch bin positions: ${response.statusText}`);
  }

  return await response.json();
};

(async () => {
  try {
    const binPositions = await fetchBinPositions(walletAddress);
    console.log("Bin positions:", binPositions);
  } catch (error) {
    console.error("Error:", error);
  }
})();