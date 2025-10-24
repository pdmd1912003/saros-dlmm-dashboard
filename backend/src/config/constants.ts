export const SOLANA_NETWORK = 'mainnet-beta';

// Primary RPC with single fallback for reliability
export const RPC_ENDPOINTS = {
  devnet: 'https://devnet.helius-rpc.com/?api-key=330bb8c3-4081-4d83-b5aa-7c4d6521f86e',
  fallbacks: [
    'https://api.devnet.solana.com',
  ]
};  


// RPC Configuration for rate limiting and retries
export const RPC_CONFIG = {
  maxRetries: 5,
  retryDelayMs: 1000,
  timeoutMs: 30000,
  rateLimit: {
    requestsPerSecond: 10,
    burstLimit: 20
  }
};

export const REFRESH_INTERVALS = {
  positions: 30000, // 30 seconds
  prices: 5000,     // 5 seconds
  analytics: 60000, // 1 minute
};

export const DEFAULT_SLIPPAGE = 0.5; // 0.5%
export const DEFAULT_PRIORITY_FEE = 0.0001; // SOL

export const UI_CONFIG = {
  maxPositionsPerPage: 10,
  chartUpdateInterval: 1000,
  animationDuration: 300,
};