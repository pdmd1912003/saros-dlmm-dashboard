"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react"

interface PositionProps {
  walletAddress: string
  pair: string
  onBack: () => void
}

export default function Position({ walletAddress, pair, onBack }: PositionProps) {
  const [positions, setPositions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!walletAddress || !pair) return

    const fetchPositions = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/positions?wallet=${walletAddress}&pair=${pair}`)
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || "Fetch failed")
        if (!data.positions?.length) {
          setError("No positions found in this pool.")
          setPositions([])
          return
        }

        setPositions(data.positions)
      } catch (err: any) {
        console.error("Fetch positions error:", err)
        setError("Failed to load positions.")
      } finally {
        setLoading(false)
      }
    }

    fetchPositions()
  }, [walletAddress, pair])

  const calculatePriceChange = (price: number, currentPrice: number) => {
    const change = ((price - currentPrice) / currentPrice) * 100
    return change.toFixed(2)
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-white p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 text-sm mb-6 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Pairs
      </button>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-gray-400 py-20">
          <Loader2 className="animate-spin w-6 h-6" />
          <span>Fetching positions...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center gap-2 text-red-400 py-20">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && positions.length > 0 && (
        <div className="space-y-8">
          {positions.map((pos, idx) => {
            const activeBin = pos.nonZeroBins?.find((b: any) => b.binId === pos.activeBinId)
            const currentPrice = activeBin?.price || 1

            const prices = pos.nonZeroBins?.map((b: any) => b.price) || []
            const minPrice = Math.min(...prices)
            const maxPrice = Math.max(...prices)

            const maxLiquidity = Math.max(...(pos.nonZeroBins?.map((b: any) => b.liquidity) || [0]))

            return (
              <div
                key={idx}
                className="border border-gray-800 rounded-2xl p-8 bg-gradient-to-b from-[#1a1f2e] to-[#151923] shadow-2xl"
              >
                <div className="text-center mb-10">
                  <div className="text-xs text-gray-500 mb-2 tracking-wide uppercase">Current Price</div>
                  <div className="text-2xl font-bold tracking-tight">{currentPrice.toFixed(6)}</div>
                </div>

                <div className="relative w-full h-72 mb-6 bg-[#0f1419]/50 rounded-xl p-4">
                  {pos.nonZeroBins?.length > 0 ? (
                    <div className="relative h-full">
                      <div className="flex gap-[1px] h-full items-end justify-center">
                        {pos.nonZeroBins.map((b: any) => {
                          const heightPercent = (b.liquidity / maxLiquidity) * 100
                          const isActive = b.binId === pos.activeBinId
                          const isLeftOfActive = b.binId < pos.activeBinId

                          return (
                            <div
                              key={b.binId}
                              title={`Bin ${b.binId}\nPrice: ${b.price.toFixed(6)}\nLiquidity: ${b.liquidity.toFixed(2)}`}
                              style={{
                                height: `${Math.max(heightPercent, 3)}%`,
                                width: `${Math.min(100 / pos.nonZeroBins.length, 10)}px`,
                              }}
                              className={`rounded-t transition-all hover:opacity-80 cursor-pointer ${
                                isActive
                                  ? "bg-white shadow-lg shadow-white/30"
                                  : isLeftOfActive
                                    ? "bg-gradient-to-t from-cyan-500 via-cyan-400 to-cyan-300"
                                    : "bg-gradient-to-t from-purple-600 via-purple-500 to-pink-400"
                              }`}
                            />
                          )
                        })}
                      </div>

                      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-[1px] border-l-2 border-dashed border-gray-500/60 pointer-events-none" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No liquidity data available
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-[10px] text-gray-600 mb-8 px-2">
                  {pos.nonZeroBins?.slice(0, 8).map((b: any, i: number) => (
                    <span key={i} className="font-mono">
                      {b.price.toFixed(6)}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between px-6 pt-6 border-t border-gray-800">
                  <div className="text-left">
                    <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      Min Price <span className="text-gray-600">ⓘ</span>
                    </div>
                    <div className="text-xl font-bold mb-1">{minPrice.toFixed(8)}</div>
                    <div
                      className={`text-sm font-semibold ${Number.parseFloat(calculatePriceChange(minPrice, currentPrice)) < 0 ? "text-red-400" : "text-green-400"}`}
                    >
                      {calculatePriceChange(minPrice, currentPrice)}%
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-2 flex items-center gap-1 justify-center">
                      Max Price <span className="text-gray-600">ⓘ</span>
                    </div>
                    <div className="text-xl font-bold mb-1">{maxPrice.toFixed(6)}</div>
                    <div
                      className={`text-sm font-semibold ${Number.parseFloat(calculatePriceChange(maxPrice, currentPrice)) > 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {calculatePriceChange(maxPrice, currentPrice)}%
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-300">{pos.nonZeroBins?.length || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">bins</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
