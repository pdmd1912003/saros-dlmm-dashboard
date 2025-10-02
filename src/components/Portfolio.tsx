"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";

// format helper
const formatAddress = (addr: any) => {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  if (addr instanceof PublicKey) return addr.toBase58();
  if (addr.toBase58) return addr.toBase58();
  return String(addr);
};

export default function Portfolio() {
  const [walletAddr, setWalletAddr] = useState("");
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPositions = async () => {
    if (!walletAddr) return;
    try {
      setLoading(true);
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddr }),
      });
      const json = await res.json();
      setPositions(json.positions || []);
    } catch (err) {
      console.error("Error fetching positions:", err);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddr) {
      fetchPositions();
    }
  }, [walletAddr]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Portfolio Viewer</h2>

      <div className="flex flex-col space-y-2 mb-4">
        <input
          type="text"
          placeholder="Enter wallet address"
          value={walletAddr}
          onChange={(e) => setWalletAddr(e.target.value)}
          className="border p-2 rounded"
        />
        <button
          onClick={fetchPositions}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          View Positions
        </button>
      </div>

      {loading && <p>Đang tải positions...</p>}
      {!loading && positions.length === 0 && walletAddr && (
        <p>Không tìm thấy position nào.</p>
      )}

      <ul className="space-y-3">
        {positions.map((pos, idx) => (
          <li key={idx} className="border p-3 rounded-lg">
            <p><strong>Pool:</strong> {formatAddress(pos.poolAddress)}</p>
            <p><strong>Position Mint:</strong> {formatAddress(pos.positionMint)}</p>
            <p>
              <strong>Liquidity Shares:</strong>{" "}
              {Array.isArray(pos.liquidityShares)
                ? pos.liquidityShares.slice(0, 5).join(", ") +
                  (pos.liquidityShares.length > 5 ? " ..." : "")
                : pos.liquidityShares}
            </p>
            <p><strong>Lower Bin ID:</strong> {pos.lowerBinId}</p>
            <p><strong>Upper Bin ID:</strong> {pos.upperBinId}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
