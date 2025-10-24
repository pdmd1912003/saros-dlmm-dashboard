"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface Pool {
  id: number
  pool_address: string
  token_base: string
  token_quote: string
  token_base_decimal: number
  token_quote_decimal: number
  trade_fee: number
  base_reserve: number
  quote_reserve: number
  created_at: string
  updated_at: string
}

export default function PoolList() {
  const [pools, setPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const poolsPerPage = 5

  useEffect(() => {
    async function loadPools() {
      setLoading(true)
      try {
        const res = await fetch(`${API_URL}/api/pools`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setPools(Array.isArray(data) ? data : data.pools || [])
      } catch (err) {
        console.error("Failed to fetch pools:", err)
      } finally {
        setLoading(false)
      }
    }
    loadPools()
  }, [])

  function truncateAddress(address: string, start = 6, end = 4) {
    if (!address) return ""
    return `${address.slice(0, start)}...${address.slice(-end)}`
  }

  function formatNumber(num: string | number) {
    const n = Number(num)
    if (isNaN(n)) return "-"
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(n)
  }

  // Pagination logic
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

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-foreground/70 font-medium">Loading Pools...</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-background">
      <div className="mb-8">
        <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">Liquidity Pools</h2>
        <p className="text-muted-foreground text-sm lg:text-base">
          Discover high-yield DeFi opportunities
        </p>
      </div>

      {pools.length === 0 ? (
        <p className="text-center text-muted-foreground">No pools available.</p>
      ) : (
        <>
          {/* --- Pool Cards --- */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paginatedPools.map((pool) => (
              <Card
                key={pool.id}
                className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
              >
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors">
                      {truncateAddress(pool.pool_address)}
                    </CardTitle>
                    <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                      {pool.trade_fee ?? 0}% Fee
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Base Mint
                    </p>
                    <code className="text-xs font-mono bg-muted/30 border border-border/50 text-foreground/80 px-2 py-1 rounded block">
                      {truncateAddress(pool.token_base)}
                    </code>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Base Reserve
                    </p>
                    <p className="text-sm font-mono text-foreground font-semibold">
                      {formatNumber(pool.base_reserve)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Quote Mint
                    </p>
                    <code className="text-xs font-mono bg-muted/30 border border-border/50 text-foreground/80 px-2 py-1 rounded block">
                      {truncateAddress(pool.token_quote)}
                    </code>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Quote Reserve
                    </p>
                    <p className="text-sm font-mono text-foreground font-semibold">
                      {formatNumber(pool.quote_reserve)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* --- Pagination Controls --- */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={page === 1}
            >
              Previous
            </Button>
            <p className="text-sm text-muted-foreground">
              Page <span className="font-semibold">{page}</span> / {totalPages}
            </p>
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
