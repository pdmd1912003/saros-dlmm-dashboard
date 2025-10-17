"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function PoolList() {
  const [pools, setPools] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadPools() {
      setLoading(true)
      try {
        const res = await fetch("/api/pools")
        const data = await res.json()
        setPools(data.pools || [])
      } catch (err) {
        console.error("Failed fetch pools:", err)
      } finally {
        setLoading(false)
      }
    }
    loadPools()
  }, [])

  function truncateAddress(address: string, start = 6, end = 4) {
    return `${address.slice(0, start)}...${address.slice(-end)}`
  }

  function formatNumber(num: string | number) {
    return new Intl.NumberFormat("en-US").format(Number(num))
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-foreground/70 font-medium">Loading Pools...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-background">
      <div className="mb-8">
        <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">Liquidity Pools</h2>
        <p className="text-muted-foreground text-sm lg:text-base">Discover high-yield DeFi opportunities</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pools.map((pool, idx) => (
          <Card
            key={idx}
            className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
          >
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors">
                  {truncateAddress(pool.address)}
                </CardTitle>
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                  {pool.tradeFee}% Fee
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Base Mint</p>
                <code className="text-xs font-mono bg-muted/30 border border-border/50 text-foreground/80 px-2 py-1 rounded block">
                  {truncateAddress(pool.baseMint)}
                </code>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Base Reserve</p>
                <p className="text-sm font-mono text-foreground font-semibold">{formatNumber(pool.baseReserve)}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quote Mint</p>
                <code className="text-xs font-mono bg-muted/30 border border-border/50 text-foreground/80 px-2 py-1 rounded block">
                  {truncateAddress(pool.quoteMint)}
                </code>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quote Reserve</p>
                <p className="text-sm font-mono text-foreground font-semibold">{formatNumber(pool.quoteReserve)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
