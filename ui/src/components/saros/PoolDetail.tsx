"use client";

import { useEffect, useState } from "react";
import { fetchPoolMetadata } from "../../../../backend/src/service/sarosService";

export default function PoolDetail({ poolAddress }: { poolAddress: string }) {
  const [metadata, setMetadata] = useState<any | null>(null);

  useEffect(() => {
    fetchPoolMetadata(poolAddress).then(setMetadata);
  }, [poolAddress]);

  if (!metadata) return <p>Đang tải pool {poolAddress}...</p>;

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Pool Detail</h3>
      <p>Pair: {metadata.pair}</p>
      <p>Base: {metadata.tokenBase?.symbol}</p>
      <p>Quote: {metadata.tokenQuote?.symbol}</p>
      <p>Liquidity USD: {metadata.totalLiquidityUsd}</p>
      <p>Current Price: {metadata.currentPrice}</p>
    </div>
  );
}
