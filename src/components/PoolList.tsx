"use client";

import { useEffect, useState } from "react";
import { fetchPools } from "../../backend/service/sarosService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PoolList() {
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPools(10)
      .then((res) => setPools(res.pools))
      .finally(() => setLoading(false));
  }, []);

function truncateAddress(address: string, start = 6, end = 4) {
  return `${address.slice(0, start)}...${address.slice(-end)}`
}

function formatNumber(num: string) {
  return new Intl.NumberFormat("en-US").format(Number(num))
}

  if (loading) return (
    <div className="p-6">
      <div className="flex items-center justify-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent neon-glow-blue" />
        <p className="text-neon-blue font-medium">Loading Pools...</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-background relative">
      {/* Background effects */}
      <div className="absolute top-0 right-1/3 w-72 h-72 bg-accent/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-secondary/10 rounded-full blur-[100px] animate-pulse delay-500" />
      
      <div className="relative z-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-neon-cyan mb-2">Liquidity Pools</h2>
          <p className="text-neon-blue text-sm lg:text-base">Discover high-yield DeFi opportunities</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool, idx) => (
            <Card key={idx} className="glass-neon border-neon-animated hover:neon-glow-blue-strong transition-all duration-300 group overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-neon-blue group-hover:text-neon-cyan transition-colors">{pool.pair}</CardTitle>
                  <Badge className="bg-secondary/20 text-neon-magenta border-secondary/30 neon-glow-magenta">{pool.tradeFee}% Fee</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-neon-cyan uppercase tracking-wider">Base Mint</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-primary/10 border border-primary/30 text-neon-blue px-2 py-1 rounded group-hover:neon-glow-blue transition-all">
                        {truncateAddress(pool.baseMint)}
                      </code>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-neon-cyan uppercase tracking-wider">Base Reserve</p>
                    <p className="text-sm font-mono text-neon-blue font-bold">{formatNumber(pool.baseReserve)}</p>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-neon-cyan uppercase tracking-wider">Quote Mint</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-accent/10 border border-accent/30 text-neon-cyan px-2 py-1 rounded group-hover:neon-glow-cyan transition-all">
                        {truncateAddress(pool.quoteMint)}
                      </code>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-neon-cyan uppercase tracking-wider">Quote Reserve</p>
                    <p className="text-sm font-mono text-neon-cyan font-bold">{formatNumber(pool.quoteReserve)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
