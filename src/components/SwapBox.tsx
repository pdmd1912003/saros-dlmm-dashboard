"use client";

import { useState } from "react";
import { quoteSwap } from "../../backend/service/sarosService";

export default function SwapBox({ pool, tokenBase, tokenQuote }: any) {
  const [amount, setAmount] = useState("0");
  const [quote, setQuote] = useState<any | null>(null);

  async function handleQuote() {
    const amt = BigInt(Math.floor(Number(amount) * 1e6)); // giả sử 6 decimals
    const q = await quoteSwap(
      pool,
      tokenBase,
      tokenQuote,
      amt,
      true,
      6,
      6,
      0.005
    );
    setQuote(q);
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Swap Box</h3>
      <input
        className="border p-2 rounded w-full mb-2"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button
        onClick={handleQuote}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Get Quote
      </button>
      {quote && (
        <div className="mt-3">
          <p>Expected Out: {quote.expectedAmountOut?.toString()}</p>
          <p>Price Impact: {quote.priceImpact}</p>
        </div>
      )}
    </div>
  );
}
