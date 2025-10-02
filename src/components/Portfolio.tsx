"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { PublicKey } from "@solana/web3.js"
import { Wallet, Database, TrendingUp, Loader2, AlertTriangle } from "lucide-react"
import { fetchUserPositions } from "@/backend/service/sarosService"

// format helper
const formatAddress = (addr: any) => {
  if (!addr) return ""
  if (typeof addr === "string") return addr
  if (addr instanceof PublicKey) return addr.toBase58()
  if (addr.toBase58) return addr.toBase58()
  return String(addr)
}

const shortenAddress = (addr: string) => {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function Portfolio() {
  const [walletAddr, setWalletAddr] = useState("")
  const [positions, setPositions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValidPubkey = useMemo(() => {
    if (!walletAddr) return false
    try {
      new PublicKey(walletAddr)
      return true
    } catch {
      return false
    }
  }, [walletAddr])

  const fetchPositions = useCallback(async () => {
    if (!isValidPubkey) {
      setError(walletAddr ? "Invalid wallet address" : null)
      return
    }
    setError(null)
    try {
      setLoading(true)
      const payer = new PublicKey(walletAddr)
      console.log("Fetching positions for wallet:", walletAddr)
      
      const userPositions = await fetchUserPositions(payer)
      console.log("Found positions:", userPositions)
      
      setPositions(Array.isArray(userPositions) ? userPositions : [])
      if (!userPositions || userPositions.length === 0) {
        setError("No positions found")
      }
    } catch (err: any) {
      console.error("Error fetching positions:", err)
      setPositions([])
      setError(err?.message || "Error loading positions")
    } finally {
      setLoading(false)
    }
  }, [walletAddr, isValidPubkey])

  useEffect(() => {
    // Auto fetch when address valid & length stable
    if (isValidPubkey) {
      fetchPositions()
    } else {
      setPositions([])
    }
  }, [isValidPubkey, fetchPositions])

  return (
    <div className="relative px-6 py-12">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse neon-glow-blue" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-pulse delay-1000 neon-glow-cyan" />

      <div className="relative z-10 w-full">
        <div className="text-center mb-8 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 neon-glow-blue mb-4">
            <Database className="w-8 h-8 text-neon-blue" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-neon-blue">
            Portfolio Viewer
          </h1>
          <p className="text-neon-cyan text-base lg:text-lg">Track your Solana liquidity positions in real-time</p>
        </div>

        <div className="glass-neon rounded-2xl p-6 lg:p-8 mb-8 neon-glow-blue max-w-4xl mx-auto">
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-neon-cyan uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4 text-neon-cyan" />
              Wallet Address
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Enter your Solana wallet address..."
                value={walletAddr}
                onChange={(e) => setWalletAddr(e.target.value)}
                className="flex-1 bg-input/80 border border-primary/30 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:neon-glow-blue transition-all font-mono text-sm w-full"
              />
              <button
                onClick={fetchPositions}
                disabled={loading || !isValidPubkey}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-6 lg:px-8 py-3 rounded-xl font-semibold hover:neon-glow-blue-strong transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap min-w-[140px] neon-glow-blue"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    View Positions
                  </>
                )}
              </button>
            </div>
            {!isValidPubkey && walletAddr && (
              <div className="flex items-center gap-2 text-xs text-red-400 font-mono">
                <AlertTriangle className="w-4 h-4" /> Invalid wallet address
              </div>
            )}
            {error && (
              <div className="mt-2 text-xs text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}
          </div>
        </div>

        {!loading && positions.length === 0 && isValidPubkey && !error && (
          <div className="glass-neon rounded-2xl p-8 lg:p-12 text-center max-w-2xl mx-auto neon-glow-cyan">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4 neon-glow-cyan">
              <Database className="w-8 h-8 text-neon-cyan" />
            </div>
            <p className="text-neon-cyan text-base lg:text-lg">No positions found for this address</p>
          </div>
        )}

        {positions.length > 0 && (
          <div className="mb-6 text-center">
            <p className="text-neon-cyan text-lg">
              Found <span className="text-neon-blue font-bold">{positions.length}</span> position{positions.length > 1 ? 's' : ''} 
              <span className="text-neon-magenta"> across active pools</span>
            </p>
          </div>
        )}

        <div className="space-y-4 lg:space-y-6">
          {positions.map((pos, idx) => {
            // Calculate active liquidity shares (non-zero values)
            const activeLiquidity = Array.isArray(pos.liquidityShares) 
              ? pos.liquidityShares.filter((share: string) => share !== '0' && Number(share) !== 0)
              : []
            const totalShares = Array.isArray(pos.liquidityShares) ? pos.liquidityShares.length : 0
            const activeSharesCount = activeLiquidity.length

            return (
              <div key={pos.positionMint || idx} className="glass-neon rounded-2xl p-4 lg:p-6 hover:neon-glow-blue-strong transition-all duration-300 group border-neon-animated scanlines">
                {/* Header with Position Summary */}
                <div className="mb-6 pb-4 border-b border-gradient-to-r from-transparent via-primary/30 to-transparent">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-neon-blue">Position #{idx + 1}</h3>
                    <div className="text-xs text-neon-cyan">
                      <span className="text-neon-magenta font-bold">{activeSharesCount}</span> / {totalShares} bins active
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
                  {/* Left column - Pool Info */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">
                        Pool Address
                      </div>
                      <div className="font-mono text-sm bg-primary/10 rounded-lg px-3 py-2 border border-primary/30 group-hover:border-primary group-hover:neon-glow-blue transition-all break-all text-neon-blue">
                        <span className="hidden lg:inline">{formatAddress(pos.poolAddress)}</span>
                        <span className="lg:hidden">{shortenAddress(formatAddress(pos.poolAddress))}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">
                        Position Address
                      </div>
                      <div className="font-mono text-sm bg-primary/10 rounded-lg px-3 py-2 border border-primary/30 group-hover:border-primary group-hover:neon-glow-blue transition-all break-all text-neon-blue">
                        <span className="hidden lg:inline">{formatAddress(pos.position)}</span>
                        <span className="lg:hidden">{shortenAddress(formatAddress(pos.position))}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">
                        Position Mint
                      </div>
                      <div className="font-mono text-sm bg-primary/10 rounded-lg px-3 py-2 border border-primary/30 group-hover:border-primary group-hover:neon-glow-blue transition-all break-all text-neon-blue">
                        <span className="hidden lg:inline">{formatAddress(pos.positionMint)}</span>
                        <span className="lg:hidden">{shortenAddress(formatAddress(pos.positionMint))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle column - Bin Range */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs font-medium text-neon-magenta uppercase tracking-wider mb-2">
                          Lower Bin
                        </div>
                        <div className="font-mono text-base lg:text-lg font-bold text-neon-magenta bg-secondary/10 rounded-lg px-3 py-2 border border-secondary/30 text-center neon-glow-magenta">
                          {pos.lowerBinId?.toLocaleString() ?? "N/A"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">
                          Upper Bin
                        </div>
                        <div className="font-mono text-base lg:text-lg font-bold text-neon-cyan bg-accent/10 rounded-lg px-3 py-2 border border-accent/30 text-center neon-glow-cyan">
                          {pos.upperBinId?.toLocaleString() ?? "N/A"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">
                        Bin Range
                      </div>
                      <div className="font-mono text-sm bg-accent/10 rounded-lg px-3 py-2 border border-accent/30 text-center text-neon-cyan">
                        {pos.lowerBinId && pos.upperBinId 
                          ? `${(pos.upperBinId - pos.lowerBinId + 1).toLocaleString()} bins`
                          : "N/A"
                        }
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">
                        Pair Info
                      </div>
                      <div className="font-mono text-sm bg-accent/10 rounded-lg px-3 py-2 border border-accent/30 text-center text-neon-cyan">
                        {formatAddress(pos.pair) ? shortenAddress(formatAddress(pos.pair)) : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Right column - Liquidity Details */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">
                        Active Liquidity Summary
                      </div>
                      <div className="font-mono text-sm bg-accent/10 rounded-lg px-3 py-2 border border-accent/30 group-hover:border-accent group-hover:neon-glow-cyan transition-all text-neon-cyan">
                        {activeSharesCount > 0 ? (
                          <div className="space-y-1">
                            <div>Active Bins: <span className="text-neon-magenta font-bold">{activeSharesCount}</span></div>
                            <div>Sample: {activeLiquidity.slice(0, 2).join(", ")}{activeLiquidity.length > 2 ? "..." : ""}</div>
                          </div>
                        ) : (
                          "No active liquidity"
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2">
                        Total Bins
                      </div>
                      <div className="font-mono text-lg font-bold bg-secondary/10 rounded-lg px-3 py-2 border border-secondary/30 text-center text-neon-magenta neon-glow-magenta">
                        {totalShares.toLocaleString()}
                      </div>
                    </div>

                    {/* Expandable liquidity details */}
                    <details className="group/details">
                      <summary className="cursor-pointer text-xs font-medium text-neon-cyan uppercase tracking-wider mb-2 hover:text-neon-blue transition-colors">
                        View All Liquidity Shares ▼
                      </summary>
                      <div className="mt-2 max-h-40 overflow-y-auto bg-primary/5 rounded-lg p-3 border border-primary/20">
                        <div className="font-mono text-xs text-neon-blue space-y-1">
                          {Array.isArray(pos.liquidityShares) ? (
                            pos.liquidityShares.map((share: string, i: number) => (
                              <div key={i} className={`flex justify-between ${share !== '0' ? 'text-neon-cyan' : 'text-muted-foreground opacity-50'}`}>
                                <span>Bin {i}:</span>
                                <span>{share}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-muted-foreground">No liquidity data</div>
                          )}
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
