"use client";

import { useEffect, useState } from "react";
import { fetchPools } from "../../backend/service/sarosService";

export default function PoolList() {
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPools(10)
      .then((res) => setPools(res.pools))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-4">Đang tải pools...</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Danh sách Pools</h2>
      <ul className="space-y-3">
        {pools.map((pool, idx) => (
          <li key={idx} className="border p-3 rounded-lg">
            <p>Pair: {pool.pair}</p>
            <p>
              {pool.tokenBase?.symbol} / {pool.tokenQuote?.symbol}
            </p>
            <p>Liquidity (USD): {pool.totalLiquidityUsd ?? "N/A"}</p>
            <p>Current Price: {pool.currentPrice ?? "N/A"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
