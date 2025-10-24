"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Loader2, ArrowLeft } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8888"

interface PositionItem {
  position_address: string
  lower_bin_id: number
  upper_bin_id: number
  token_base_amount: number
  token_quote_amount: number
  liquidity_amount: number
  created_at: string
}

interface PositionProps {
  walletAddress: string
  poolAddress: string
  onBack: () => void
}

export default function Position({ walletAddress, poolAddress, onBack }: PositionProps) {
  const [positions, setPositions] = useState<PositionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const positionsPerPage = 6

  // ---------------------------
  // 🔍 Load positions by wallet + pool
  // ---------------------------
  useEffect(() => {
    async function loadPositions() {
      setLoading(true)
      try {
        const res = await fetch(
          `${API_URL}/api/positions?wallet=${walletAddress}&pool=${poolAddress}`
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setPositions(Array.isArray(data) ? data : data.positions || [])
      } catch (err) {
        console.error("❌ Failed to fetch positions:", err)
        setPositions([])
      } finally {
        setLoading(false)
      }
    }
    loadPositions()
  }, [walletAddress, poolAddress])

  const totalPages = Math.ceil(positions.length / positionsPerPage)
  const paginatedPositions = useMemo(() => {
    const startIndex = (page - 1) * positionsPerPage
    return positions.slice(startIndex, startIndex + positionsPerPage)
  }, [positions, page])

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
  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <h2 className="text-xl font-semibold text-foreground">
            Pool: {truncateAddress(poolAddress)}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center gap-3 py-10">
            <Loader2 className="animate-spin w-6 h-6 text-primary" />
            <span className="text-muted-foreground">Loading positions...</span>
          </div>
        ) : positions.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            No positions found in this pool for this wallet.
          </p>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedPositions.map((pos, i) => (
                <Card
                  key={`${pos.position_address}-${i}`}
                  className="bg-card/50 border-border/50 hover:border-primary/50 transition-all"
                >
                  <CardHeader className="pb-3 border-b border-border/50">
                    <CardTitle className="text-sm font-mono text-foreground">
                      {truncateAddress(pos.position_address)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2 text-sm text-foreground/80">
                    <p>
                      <span className="text-muted-foreground">Bin Range:</span>{" "}
                      {pos.lower_bin_id} → {pos.upper_bin_id}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Base Amount:</span>{" "}
                      {pos.token_base_amount.toFixed(4)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Quote Amount:</span>{" "}
                      {pos.token_quote_amount.toFixed(4)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Liquidity:</span>{" "}
                      {pos.liquidity_amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(pos.created_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
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
