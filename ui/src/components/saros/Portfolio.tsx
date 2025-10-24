"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Loader2, Wallet } from "lucide-react"
import Position from "./Position"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8888"

interface Pool {
  poolAddress: string
  tokenBase: string
  tokenQuote: string
  positionsCount: number
}

export default function Portfolio() {
  const [walletAddress, setWalletAddress] = useState("")
  const [pools, setPools] = useState<Pool[]>([])
  const [selectedPool, setSelectedPool] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const poolsPerPage = 6

  // ---------------------------
  // 🔍 Load pools by wallet
  // ---------------------------
  useEffect(() => {
    if (walletAddress.length < 32) return

    async function loadPools() {
      setLoading(true)
      try {
        const res = await fetch(`${API_URL}/api/positions/pools?wallet=${walletAddress}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setPools(Array.isArray(data) ? data : data.pools || [])
      } catch (err) {
        console.error("❌ Failed to fetch wallet pools:", err)
        setPools([])
      } finally {
        setLoading(false)
      }
    }

    loadPools()
  }, [walletAddress])

  const totalPages = Math.ceil(pools.length / poolsPerPage)
  const paginatedPools = useMemo(() => {
    const startIndex = (page - 1) * poolsPerPage
    return pools.slice(startIndex, startIndex + poolsPerPage)
  }, [pools, page])

  function handleNext() {
    if (page < totalPages) setPage((p) => p + 1)
  }

  function handlePrev() {
    if (page > 1) setPage((p) => p - 1)
  }

  function truncateAddress(addr: string) {
    return addr ? `${addr.slice(0, 6)}...${addr.slice(-6)}` : "-"
  }

  // ---------------------------
  // 🧭 Render
  // ---------------------------
  if (selectedPool) {
    return (
      <Position
        walletAddress={walletAddress}
        poolAddress={selectedPool}
        onBack={() => setSelectedPool(null)}
      />
    )
  }

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Wallet className="w-7 h-7 text-primary" /> Portfolio
          </h2>
          <p className="text-muted-foreground text-sm">
            Enter your Solana wallet address to view your liquidity pools.
          </p>
        </div>

        {/* --- Wallet Input --- */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Enter wallet address..."
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value.trim())}
            className="w-full bg-muted/10 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* --- Loading & Empty states --- */}
        {loading ? (
          <div className="flex justify-center items-center gap-3 py-10">
            <Loader2 className="animate-spin w-6 h-6 text-primary" />
            <span className="text-muted-foreground">Loading wallet pools...</span>
          </div>
        ) : pools.length === 0 && walletAddress.length >= 32 ? (
          <p className="text-center text-muted-foreground py-10">
            No pools found for this wallet.
          </p>
        ) : (
          <>
            {/* --- Pool Cards --- */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedPools.map((pool, i) => (
                <Card
                  key={`${pool.poolAddress}-${i}`}
                  onClick={() => setSelectedPool(pool.poolAddress)}
                  className="cursor-pointer bg-card/50 border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all"
                >
                  <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {truncateAddress(pool.poolAddress)}
                      </CardTitle>
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {pool.positionsCount ?? 0} Positions
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Token Base</p>
                      <code className="text-xs font-mono">{truncateAddress(pool.tokenBase)}</code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Token Quote</p>
                      <code className="text-xs font-mono">{truncateAddress(pool.tokenQuote)}</code>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* --- Pagination --- */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button variant="outline" onClick={handlePrev} disabled={page === 1}>
                  Previous
                </Button>
                <p className="text-sm text-muted-foreground">
                  Page <span className="font-semibold">{page}</span> / {totalPages}
                </p>
                <Button variant="outline" onClick={handleNext} disabled={page === totalPages}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
