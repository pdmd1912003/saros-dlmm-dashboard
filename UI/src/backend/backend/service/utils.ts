import { BinInfo, DLMMPosition, PoolInfo, PositionAnalytics } from '@/backend/service/types'

export function parseBinId(binId: number): { price: number; isValid: boolean } {
    try {
        // DLMM bins represent price points in a logarithmic scale
        // This is a simplified calculation - actual implementation would use SDK methods
        const price = Math.pow(1.001, binId) * 100 // Base price of 100 with 0.1% steps
        return { price, isValid: true }
    } catch (error) {
        return { price: 0, isValid: false }
    }
}

export function calculateBinRange(
    activeBinId: number,
    range: number
): { centerBin: number; minBin: number; maxBin: number; binIds: number[] } {
    const halfRange = Math.floor(range / 2)
    const minBin = activeBinId - halfRange
    const maxBin = activeBinId + (range - halfRange - 1)
    const binIds = Array.from({ length: range }, (_, i) => minBin + i)

    return { centerBin: activeBinId, minBin, maxBin, binIds }
}

export function formatBinData(binData: any[]): BinInfo[] {
    if (!binData || !Array.isArray(binData)) {
        return []
    }

    return binData.map((bin) => ({
        binId: bin.binId || 0,
        price: bin.price || parseBinId(bin.binId || 0).price,
        liquidityX: bin.reserveX || bin.liquidityX || '0',
        liquidityY: bin.reserveY || bin.liquidityY || '0',
        isActive: bin.isActive || false,
        feeRate: bin.feeRate || 0,
        volume24h: bin.volume24h || '0',
    }))
}

export function calculateLiquidityDistribution(
    strategy: 'spot' | 'curve' | 'bid-ask',
    activeBinId: number,
    range: number,
    totalAmount: number
): { binId: number; xAmount: number; yAmount: number }[] {
    const { binIds } = calculateBinRange(activeBinId, range)
    const amountPerBin = totalAmount / binIds.length

    switch (strategy) {
        case 'spot':
            // Even distribution for spot strategy
            return binIds.map((binId) => ({
                binId,
                xAmount: amountPerBin / 2,
                yAmount: amountPerBin / 2,
            }))

        case 'curve':
            // Concentrated around center for curve strategy
            const centerIndex = Math.floor(binIds.length / 2)
            return binIds.map((binId, index) => {
                const distance = Math.abs(index - centerIndex)
                const weight = Math.max(0.1, 1 - distance * 0.3) // More weight to center bins
                const weightedAmount = (totalAmount * weight) / binIds.reduce((sum, _, i) => {
                    const d = Math.abs(i - centerIndex)
                    return sum + Math.max(0.1, 1 - d * 0.3)
                }, 0)

                return {
                    binId,
                    xAmount: weightedAmount / 2,
                    yAmount: weightedAmount / 2,
                }
            })

        case 'bid-ask':
            // Split between buy (lower bins) and sell (upper bins)
            const midIndex = Math.floor(binIds.length / 2)
            return binIds.map((binId, index) => {
                if (index < midIndex) {
                    // Lower bins - more X tokens (bids)
                    return { binId, xAmount: amountPerBin * 0.8, yAmount: amountPerBin * 0.2 }
                } else if (index > midIndex) {
                    // Upper bins - more Y tokens (asks)
                    return { binId, xAmount: amountPerBin * 0.2, yAmount: amountPerBin * 0.8 }
                } else {
                    // Middle bin - balanced
                    return { binId, xAmount: amountPerBin / 2, yAmount: amountPerBin / 2 }
                }
            })

        default:
            throw new Error(`Unknown strategy: ${strategy}`)
    }
}

export function calculatePositionValue(
    position: DLMMPosition,
    tokenPrices: Record<string, number>
): number {
    const tokenXPrice = tokenPrices[position.tokenX.address.toString()] || 0
    const tokenYPrice = tokenPrices[position.tokenY.address.toString()] || 0

    // This is a simplified calculation - actual value would depend on bin distributions
    const liquidityValue = parseFloat(position.liquidityAmount)
    return liquidityValue * (tokenXPrice + tokenYPrice) / 2
}

