export interface TokenBalance {
    mint: string;
    amount: number;
    uiAmount: number;
    decimals: number;
    symbol?: string;
    price?: number;
}

export interface LiquidityPosition {
    poolId: string;
    lpMint: string;
    tokenA: TokenBalance;
    tokenB: TokenBalance;
    yourSharePercentage: number;
    valueUsd: number;
}

export interface PortfolioSummary {
    totalValueUsd: number;
    tokens: TokenBalance[];
    positions: LiquidityPosition[];
}