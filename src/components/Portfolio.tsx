"use client"

import { useState, useEffect } from "react"
import { Wallet, Loader2, TrendingUp, AlertTriangle } from "lucide-react"
import Position from "./Position"

export default function Portfolio() {
  const [walletAddress, setWalletAddress] = useState("")
  const [pairs, setPairs] = useState<any[]>([])
  const [selectedPair, setSelectedPair] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (walletAddress.length < 32) return

    const fetchPairs = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/pairs?wallet=${walletAddress}`)
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || "Fetch failed")
        if (!data.pairs?.length) {
          setError("No pairs found for this wallet.")
          setPairs([])
          return
        }

        setPairs(data.pairs)
      } catch (err: any) {
        console.error("Fetch pairs error:", err)
        setError("Failed to load pairs.")
      } finally {
        setLoading(false)
      }
    }

    fetchPairs()
  }, [walletAddress])

  if (selectedPair) {
    return <Position walletAddress={walletAddress} pair={selectedPair} onBack={() => setSelectedPair(null)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-white mb-2">
            <TrendingUp className="w-8 h-8 text-cyan-400" />
            Saros DLMM Portfolio
          </h1>
          <p className="text-slate-400 text-sm ml-11">View and manage your liquidity positions</p>
        </div>

        <div className="mb-8 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <Wallet className="w-5 h-5 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Enter wallet address..."
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value.trim())}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 text-slate-400 py-12">
            <Loader2 className="animate-spin w-6 h-6 text-cyan-400" />
            <span className="text-sm">Fetching pairs...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!loading && !error && pairs.length > 0 && (
          <div className="grid gap-4">
            {pairs.map((pair, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedPair(pair.pair)}
                className="group relative bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/50 hover:border-cyan-500/30 transition-all cursor-pointer overflow-hidden"
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-slate-400">Pool</span>
                        <span className="font-mono text-white font-medium">
                          {pair.pair.slice(0, 6)}...{pair.pair.slice(-6)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono">{pair.poolAddress}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span className="text-sm text-slate-300 font-medium">{pair.positionsCount}</span>
                      <span className="text-xs text-slate-500">
                        {pair.positionsCount === 1 ? "position" : "positions"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && pairs.length === 0 && walletAddress.length >= 32 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm">No positions found for this wallet</p>
          </div>
        )}
      </div>
    </div>
  )
}
