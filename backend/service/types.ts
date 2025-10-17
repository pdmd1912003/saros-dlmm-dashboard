import { PublicKey } from '@solana/web3.js'

export interface DLMMPosition {
  id: string
  poolAddress: PublicKey
  userAddress: PublicKey
  tokenX: TokenInfo
  tokenY: TokenInfo
  activeBin: number
  liquidityAmount: string
  feesEarned: {
    tokenX: string
    tokenY: string
  }
  createdAt: Date
  lastUpdated: Date
  isActive: boolean
  // Optional calculated properties (present in EnhancedDLMMPosition)
  publicKey?: PublicKey
  pair?: PublicKey
  currentValue?: number
  initialValue?: number
  pnl?: number
  pnlPercent?: number
  realizedPnl?: number
  unrealizedPnl?: number
  feeEarnings?: number
  impermanentLoss?: number
  bins?: BinInfo[]
  updatedAt?: Date
}

// Extended interface for portfolio analysis with calculated properties
export interface EnhancedDLMMPosition extends DLMMPosition {
  publicKey: PublicKey
  pair: PublicKey
  currentValue: number
  initialValue: number
  pnl: number
  pnlPercent: number
  realizedPnl?: number
  unrealizedPnl?: number
  feeEarnings?: number
  impermanentLoss?: number
  bins?: BinInfo[]
  updatedAt: Date
}

export interface TokenInfo {
  address: PublicKey
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  price: number
  tags?: string[]
}

export interface BinInfo {
  binId: number
  price: number
  liquidityX: string
  liquidityY: string    
  totalLiquidity?: string
  isActive: boolean
  feeRate: number
  volume24h: string
}

// Enhanced bin analysis types for advanced operations
export interface LiquidityDistribution {
  concentrated: number
  spread: number
  ranges: PriceRange[]
}

export interface PriceRange {
  min: number
  max: number
  binIds: number[]
  liquidity: string
}

export interface PoolInfo {
  address: PublicKey
  tokenX: TokenInfo
  tokenY: TokenInfo
  activeBin: BinInfo
  totalLiquidity: string
  volume24h: string
  fees24h: string
  apr: number
  createdAt: Date
}

export interface PositionAnalytics {
  totalValue: number
  pnl: {
    amount: number
    percentage: number
  }
  feesEarned: number
  impermanentLoss: {
    amount: number
    percentage: number
  }
  apr: number
  duration: number
}

export interface RebalanceStrategy {
  id: string
  name: string
  description: string
  parameters: {
    targetRange: number
    rebalanceThreshold: number
    maxSlippage: number
    priority: 'efficiency' | 'fees' | 'balance'
  }
  isActive: boolean
}

export interface LimitOrder {
  id: string
  poolAddress: PublicKey
  type: 'buy' | 'sell'
  amount: string
  targetPrice: number
  currentPrice: number
  status: 'active' | 'filled' | 'cancelled'
  createdAt: Date
  expiresAt?: Date
}

export interface NetworkStats {
  totalValueLocked: string
  totalVolume24h: string
  totalFees24h: string
  activePools: number
  totalTransactions: number
}

// ============================================================================
// ORACLE PRICE FEEDS TYPES
// ============================================================================

export interface PriceData {
  symbol: string
  price: number
  confidence: number
  timestamp: Date
  source: 'pyth' | 'switchboard' | 'fallback'
}

export interface PriceFeedConfig {
  symbol: string
  pythPriceId?: string
  switchboardFeedId?: string
  fallbackPrice?: number
}

export interface PositionValuation {
  totalValue: number
  tokenXValue: number
  tokenYValue: number
  priceData: Record<string, PriceData>
}

export interface OracleCacheStats {
  count: number
  symbols: string[]
}

// ============================================================================
// FEE TIER MANAGEMENT TYPES
// ============================================================================

export interface FeeTier {
  id: string
  name: string
  baseFeeBps: number
  protocolFeeBps: number
  totalFeeBps: number
  category: 'stable' | 'volatile' | 'exotic' | 'custom'
  description: string
  recommendedFor: string[]
  minLiquidity: string
  maxLiquidity?: string
  isActive: boolean
}

export interface FeeAnalysis {
  currentTier: FeeTier
  recommendedTier: FeeTier | null
  potentialSavings: number
  savingsPercentage: number
  analysisReason: string
  optimization: {
    timeToBreakeven: number
    projectedAnnualSavings: number
    riskLevel: 'low' | 'medium' | 'high'
  }
}

export interface FeeOptimizationSettings {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  liquidityRange: 'tight' | 'moderate' | 'wide'
  rebalanceFrequency: 'never' | 'weekly' | 'daily' | 'hourly'
  maxSlippage: number
  prioritizeFees: boolean
}

export interface FeeMigrationImpact {
  migrationCost: number
  dailySavings: number
  breakEvenDays: number
  annualBenefit: number
}

// ============================================================================
// POSITION MIGRATION TYPES
// ============================================================================

export interface MigrationRoute {
  id: string
  fromPool: PublicKey
  toPool: PublicKey
  fromPair: string
  toPair: string
  migrationReason: 'better_fees' | 'higher_liquidity' | 'better_apr' | 'consolidation' | 'strategy_change'
  estimatedCost: number
  estimatedBenefit: number
  timeToBreakeven: number
  confidence: number
}

export interface MigrationPlan {
  id: string
  name: string
  description: string
  positions: DLMMPosition[]
  routes: MigrationRoute[]
  totalCost: number
  totalBenefit: number
  estimatedDuration: number
  riskLevel: 'low' | 'medium' | 'high'
  steps: MigrationStep[]
}

export interface MigrationStep {
  id: string
  order: number
  type: 'remove_liquidity' | 'swap_tokens' | 'add_liquidity' | 'claim_fees' | 'close_position'
  description: string
  poolAddress: PublicKey
  estimatedGas: number
  estimatedTime: number
  dependencies: string[]
}

export interface MigrationProgress {
  planId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  currentStep: number
  totalSteps: number
  completedSteps: string[]
  failedSteps: string[]
  startTime?: Date
  endTime?: Date
  errors: Array<{ stepId: string; error: string; timestamp: Date }>
}

export interface CrossPoolOpportunity {
  fromPosition: DLMMPosition
  targetPool: PublicKey
  targetPair: string
  improvementMetrics: {
    feeImprovement: number
    aprImprovement: number
    liquidityImprovement: number
    volumeImprovement: number
  }
  migrationCost: number
  projectedBenefit: number
  recommendation: 'highly_recommended' | 'recommended' | 'neutral' | 'not_recommended'
}

// ============================================================================
// PORTFOLIO AGGREGATION TYPES
// ============================================================================

export interface PortfolioPosition {
  id: string
  positions: DLMMPosition[]
  tokenPair: string
  tokenX: TokenInfo
  tokenY: TokenInfo
  aggregatedMetrics: {
    totalLiquidity: string
    totalValue: number
    weightedApr: number
    totalFeesEarned: number
    averageActiveBin: number
    positionCount: number
  }
  diversificationScore: number
  riskMetrics: {
    concentrationRisk: number
    correlationRisk: number
    liquidityRisk: number
    overallRiskScore: number
  }
  optimization: {
    canConsolidate: boolean
    consolidationBenefit: number
    recommendedActions: string[]
  }
}

export interface PortfolioSummary {
  totalPositions: number
  totalValue: number
  totalLiquidity: string
  diversifiedPairs: number
  topPerformingPairs: string[]
  underPerformingPairs: string[]
  riskDistribution: {
    low: number
    medium: number
    high: number
  }
  assetAllocation: Array<{
    symbol: string
    percentage: number
    value: number
    positions: number
  }>
  performanceMetrics: {
    totalPnl: number
    totalPnlPercentage: number
    bestPosition: DLMMPosition | null
    worstPosition: DLMMPosition | null
    avgApr: number
    totalFeesEarned: number
  }
}

export interface ConsolidationOpportunity {
  id: string
  type?: 'similar_pairs' | 'low_efficiency' | 'overlapping_ranges' | 'high_fee_concentration'
  targetPair: string
  positions: DLMMPosition[]
  currentPools: PublicKey[]
  recommendedPool: PublicKey
  benefits: {
    reducedGasCosts: number
    improvedLiquidity: number
    betterApr: number
    simplifiedManagement: boolean
  }
  consolidationCost: number
  projectedSavings: number
  priority: 'high' | 'medium' | 'low'
  analysis?: {
    summary: {
      totalPositions: number
      estimatedSavings: number
      riskLevel: string
      recommendation: string
    }
    benefits: Array<{
      type: string
      value: number
      description: string
    }>
    costs: Array<{
      type: string
      value: number
      description: string
    }>
  }
}

export interface DiversificationAnalysis {
  overallScore: number
  tokenDiversification: {
    uniqueTokens: number
    dominantToken: string
    dominantPercentage: number
    recommendations: string[]
  }
  pairDiversification: {
    uniquePairs: number
    topPairs: Array<{ pair: string; percentage: number }>
    concentrationWarnings: string[]
  }
  poolDiversification: {
    uniquePools: number
    averagePoolSize: string
    liquidityDistribution: 'concentrated' | 'distributed' | 'balanced'
  }
}

// ============================================================================
// BACKTESTING SYSTEM TYPES
// ============================================================================

export interface HistoricalPricePoint {
  timestamp: Date
  open: number
  high: number
  low: number
  close: number
  volume: string
  volumeX: string
  volumeY: string
}

export interface HistoricalLiquidityPoint {
  timestamp: Date
  binId: number
  liquidityX: string
  liquidityY: string
  feeRate: number
  isActive: boolean
}

export interface HistoricalData {
  poolAddress: PublicKey
  timeRange: {
    start: Date
    end: Date
    interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  }
  priceData: HistoricalPricePoint[]
  liquidityData: HistoricalLiquidityPoint[]
  metadata: {
    dataPoints: number
    coverage: number // percentage of time covered
    source: 'api' | 'mock' | 'cached'
  }
}

export interface BacktestConfig {
  id: string
  name: string
  description?: string
  strategy: {
    id: string
    name: string
    parameters: any
  }
  market: {
    poolAddress: PublicKey
    tokenXSymbol: string
    tokenYSymbol: string
  }
  timeframe: {
    startDate: Date
    endDate: Date
    interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  }
  capital: {
    initialAmount: number
    currency: 'USD' | 'tokenX' | 'tokenY'
  }
  costs: {
    gasPrice: number
    slippage: number
    transactionFee: number
  }
  rebalancing: {
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
    minThreshold: number
  }
  riskManagement: {
    maxDrawdown?: number
    stopLoss?: number
    takeProfit?: number
  }
}

export interface StrategyAction {
  timestamp: Date
  type: 'rebalance' | 'add_liquidity' | 'remove_liquidity' | 'close_position' | 'initialize'
  parameters: {
    fromBins?: number[]
    toBins?: number[]
    amountX?: string
    amountY?: string
    reason: string
  }
  costs: {
    gas: number
    slippage: number
    fees: number
  }
  result: {
    success: boolean
    newPositionValue: number
    error?: string
  }
}

export interface PositionSnapshot {
  timestamp: Date
  binDistribution: {
    binId: number
    liquidityX: string
    liquidityY: string
    value: number
  }[]
  totalValue: number
  tokenXBalance: string
  tokenYBalance: string
  feesEarned: {
    tokenX: string
    tokenY: string
    usdValue: number
  }
  metrics: {
    apr: number
    impermanentLoss: number
    utilization: number
  }
}

export interface TimeSeriesPoint {
  timestamp: Date
  portfolioValue: number
  benchmarkValue: number // hold strategy value
  position: PositionSnapshot
  action?: StrategyAction
  marketPrice: number
  marketVolume: string
}

export interface BacktestMetrics {
  // Return metrics
  totalReturn: number
  annualizedReturn: number
  benchmarkReturn: number // vs hold strategy
  excessReturn: number

  // Risk metrics
  volatility: number
  sharpeRatio: number
  sortinoRatio: number
  maxDrawdown: number
  maxDrawdownDuration: number

  // Trading metrics
  totalTrades: number
  profitableTrades: number
  winRate: number
  profitFactor: number
  avgTradeReturn: number
  largestWin: number
  largestLoss: number

  // Cost metrics
  totalFees: number
  totalGas: number
  totalSlippage: number
  costToReturn: number

  // DLMM-specific metrics
  totalFeesEarned: number
  avgApr: number
  liquidityUtilization: number
  rebalanceFrequency: number
  impermanentLossRecovery: number
}

export interface BacktestResult {
  config: BacktestConfig
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
  startedAt?: Date
  completedAt?: Date

  metrics: BacktestMetrics
  timeSeriesData: TimeSeriesPoint[]
  actions: StrategyAction[]

  summary: {
    bestPeriod: {
      start: Date
      end: Date
      return: number
    }
    worstPeriod: {
      start: Date
      end: Date
      return: number
    }
    keyInsights: string[]
    recommendations: string[]
  }

  error?: {
    message: string
    timestamp: Date
  }
}

export interface StrategyComparison {
  id: string
  name: string
  strategies: {
    config: BacktestConfig
    result: BacktestResult
    color: string
  }[]
  comparisonMetrics: {
    metric: keyof BacktestMetrics
    values: number[]
    winner: number // index of winning strategy
  }[]
  created: Date
}

export interface BacktestOptimization {
  baseConfig: BacktestConfig
  parameters: {
    name: string
    range: [number, number]
    step: number
    optimal: number
  }[]
  results: {
    parameterValues: Record<string, number>
    metrics: BacktestMetrics
    rank: number
  }[]
  optimalConfig: BacktestConfig
}

export interface BacktestCache {
  key: string
  data: HistoricalData
  expiresAt: Date
  size: number
  hits: number
}

// ============================================================================
// POOL ANALYTICS TYPES - Real Saros DLMM API Integration
// ============================================================================

export interface PoolMetrics {
  tvl: string
  volume24h: string
  fees24h: string
  apr: number
  activeBins: number
  priceChange24h: number
  volumeChange24h: number
  aprChange24h: number
  totalBins: number
  lastUpdated: Date
}

export interface FeeDistribution {
  binRange: string
  percentage: number
  feesCollected: string
  binIds: number[]
}

export interface LiquidityConcentration {
  concentrationRatio: number
  highActivityBins: number
  mediumActivityBins: number
  lowActivityBins: number
  optimalRange: boolean
  binEfficiency: {
    highActivity: number // ±2 bins efficiency
    mediumActivity: number // ±5 bins efficiency
    lowActivity: number // ±10 bins efficiency
  }
}

export interface PoolHistoricalPerformance {
  apr7d: number
  apr30d: number
  aprChange7d: number
  aprChange30d: number
  poolAge: number // days since creation
  poolAgeCategory: 'new' | 'growing' | 'mature'
  volume7d: string
  volume30d: string
  fees7d: string
  fees30d: string
}

export interface PoolAnalyticsData {
  metrics: PoolMetrics | null
  feeDistribution: FeeDistribution[]
  liquidityConcentration: LiquidityConcentration | null
  historicalPerformance: PoolHistoricalPerformance | null
  poolInfo: PoolInfo | null
}

export interface PoolListItem {
  address: PublicKey
  name: string // e.g., "SOL/USDC"
  tokenX: string // symbol
  tokenY: string // symbol
  tvl: string
  volume24h: string
  apr: number
  isActive: boolean
}

// ============================================================================
// PREDICTIVE CACHE MANAGER TYPES
// ============================================================================

export interface UserBehaviorPattern {
  id: string
  userId: string
  sessionId: string
  timestamp: Date
  action: 'navigate' | 'click' | 'view' | 'refresh' | 'execute' | 'analyze'
  target: string // page, component, or data identifier
  context: {
    route: string
    previousRoute?: string
    timeOnPage: number
    walletConnected: boolean
    positionCount: number
    lastRefresh: Date
  }
  metadata: Record<string, any>
}

export interface NavigationPattern {
  sequence: string[]
  frequency: number
  avgTimeSpent: number
  nextMostLikely: string
  confidence: number
}

export interface TimePattern {
  hourOfDay: number
  dayOfWeek: number
  activityLevel: 'high' | 'medium' | 'low'
  commonActions: string[]
  peakTimes: Array<{
    start: number
    end: number
    intensity: number
  }>
}

export interface ActionSequencePattern {
  sequence: string[]
  frequency: number
  successRate: number
  avgDuration: number
  nextActions: Array<{
    action: string
    probability: number
    avgDelay: number
  }>
}

export interface PoolAffinityPattern {
  poolAddress: string
  tokenPair: string
  interactionCount: number
  avgSessionTime: number
  lastInteraction: Date
  preferredActions: string[]
  analysisFrequency: number
}

export interface CachePrediction {
  dataType: 'position' | 'pool' | 'price' | 'analytics' | 'portfolio'
  identifier: string
  confidence: number
  priority: number
  reasoning: string
  predictedAccessTime: Date
  expirationTime: Date
}

export interface CachePreloadJob {
  id: string
  prediction: CachePrediction
  status: 'queued' | 'loading' | 'completed' | 'failed' | 'expired'
  startTime?: Date
  endTime?: Date
  dataSize?: number
  errorMessage?: string
}

export interface UserBehaviorProfile {
  userId: string
  createdAt: Date
  lastUpdated: Date
  sessionCount: number
  totalActions: number
  patterns: {
    navigation: NavigationPattern[]
    timing: TimePattern[]
    actions: ActionSequencePattern[]
    pools: PoolAffinityPattern[]
  }
  preferences: {
    preferredPools: string[]
    preferredActions: string[]
    refreshFrequency: number
    analyticsUsage: number
  }
  predictiveAccuracy: {
    hitRate: number
    missRate: number
    falsePositiveRate: number
    averageConfidence: number
  }
}

export interface PredictiveCacheStats {
  totalPredictions: number
  successfulPreloads: number
  hitRate: number
  missRate: number
  averageConfidence: number
  cacheSize: number
  preloadQueueSize: number
  dataSaved: number
  performanceGain: number
}

export interface PredictiveRule {
  id: string
  name: string
  condition: string
  action: CachePrediction
  confidence: number
  priority: number
  isActive: boolean
  createdAt: Date
  lastTriggered?: Date
  successCount: number
  totalTriggers: number
}

// ============================================================================
// PORTFOLIO OPTIMIZATION TYPES (Missing interfaces for tests)
// ============================================================================

export interface PortfolioWeight {
  weight: number
  asset?: string
  allocation?: number
  value?: number
}

export interface OptimizationMetrics {
  status: 'success' | 'failed' | 'pending'
  totalValue: number
  riskScore?: number
  returnRate?: number
  sharpeRatio?: number
  volatility?: number
  // Test-required properties
  improvementScore: number
  riskReduction: number
  returnEnhancement: number
  costEfficiency: number
  diversificationImprovement: number
  liquidityImprovement: number
  convergenceScore: number
}

export interface OptimizationResult {
  optimization: OptimizationMetrics
  weights: PortfolioWeight[]
  success: boolean
  timestamp: Date
  metadata?: any
}

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccess: number
  size: number
  source: 'user_request' | 'predictive_preload' | 'background_refresh'
}

// ============================================================================
// ADVANCED ARBITRAGE DETECTION TYPES
// ============================================================================

export interface ArbitrageOpportunity {
  id: string
  type: 'direct' | 'triangular' | 'multi_hop'
  pools: ArbitragePool[]
  path: ArbitragePath
  profitability: ProfitabilityMetrics
  risk: RiskAssessment
  executionPlan: ExecutionStep[]
  mev: MEVProtection
  timestamp: number
  confidence: number
  expirationTime?: number
}

export interface ArbitragePool {
  poolAddress: PublicKey
  tokenX: TokenInfo
  tokenY: TokenInfo
  activeBin: {
    binId: number
    price: number
    liquidityX: string
    liquidityY: string
  }
  liquidity: number
  volume24h: number
  fees: number
  slippage: number
  lastUpdated: Date
}

export interface ArbitragePath {
  inputToken: TokenInfo
  outputToken: TokenInfo
  route: RouteStep[]
  totalDistance: number
  complexity: 'simple' | 'moderate' | 'complex'
  estimatedGas: number
  priceImpact: number
}

export interface RouteStep {
  poolAddress: PublicKey
  tokenIn: TokenInfo
  tokenOut: TokenInfo
  amountIn: number
  amountOut: number
  priceImpact: number
  binRange: { min: number; max: number }
  action?: 'swap' | 'add_liquidity' | 'remove_liquidity'
}

export interface ProfitabilityMetrics {
  grossProfit: number
  netProfit: number
  profitMargin: number
  returnOnInvestment: number
  breakevenAmount: number
  maxProfitableAmount: number
  gasCosts: number
  priorityFees: number
}

export interface RiskAssessment {
  liquidityRisk: number
  slippageRisk: number
  mevRisk: number
  temporalRisk: number
  competitionRisk: number
  overallRisk: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: string[]
}

export interface ExecutionStep {
  stepNumber: number
  action: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'wait'
  pool: PublicKey
  tokenIn?: TokenInfo
  tokenOut?: TokenInfo
  amount: number
  expectedOutput: number
  maxSlippage: number
  timeoutMs: number
  dependencies: number[]
}

export interface MEVProtection {
  strategy: 'private_mempool' | 'flashbots' | 'time_delay' | 'randomization'
  jitterMs: number
  maxFrontrunProtection: number
  privateMempoolUsed: boolean
  bundlingRequired: boolean
}

export interface DetailedProfitabilityAnalysis {
  baseAnalysis: ProfitabilityMetrics
  scenarios: ProfitabilityScenario[]
  riskAdjustedMetrics: RiskAdjustedProfitability
  costBreakdown: CostBreakdown
  marketImpact: MarketImpactAnalysis
  recommendations: ProfitabilityRecommendation[]
  sensitivity: SensitivityAnalysis
}

export interface ProfitabilityScenario {
  name: string
  description: string
  probability: number
  inputAmount: number
  expectedProfit: number
  worstCaseProfit: number
  bestCaseProfit: number
  executionTime: number
  gasRequired: number
}

export interface RiskAdjustedProfitability {
  sharpeRatio: number
  sortinoRatio: number
  maxDrawdown: number
  valueAtRisk: number
  conditionalValueAtRisk: number
  probabilityOfProfit: number
  expectedShortfall: number
}

export interface CostBreakdown {
  transactionFees: TransactionCost[]
  slippageImpact: SlippageImpact[]
  mevProtectionCost: number
  opportunityCost: number
  capitalRequirement: number
  totalCosts: number
  costRatio: number
}

export interface TransactionCost {
  step: number
  description: string
  baseFee: number
  priorityFee: number
  computeUnits: number
  estimatedFee: number
}

export interface SlippageImpact {
  poolAddress: PublicKey
  tokenPair: string
  expectedSlippage: number
  worstCaseSlippage: number
  slippageCost: number
  liquidityDepth: number
}

export interface MarketImpactAnalysis {
  priceImpact: PriceImpactTier[]
  liquidityAnalysis: LiquidityAnalysis
  competitionRisk: CompetitionAnalysis
  temporalDecay: TemporalDecayAnalysis
}

export interface PriceImpactTier {
  amountRange: { min: number; max: number }
  averageImpact: number
  maximumImpact: number
  liquidityUtilization: number
  recommendedMaxAmount: number
}

export interface LiquidityAnalysis {
  totalLiquidity: number
  activeLiquidity: number
  liquidityDistribution: Array<{
    binId: number
    liquidity: number
    distance: number
  }>
  liquidityDepthScore: number
  liquidityStability: number
}

export interface CompetitionAnalysis {
  historicalCompetition: number
  mevBotActivity: number
  averageExecutionDelay: number
  successRate: number
  competitionPressure: 'low' | 'medium' | 'high' | 'extreme'
}

export interface TemporalDecayAnalysis {
  halfLife: number
  decayRate: number
  sustainabilityScore: number
  optimalExecutionWindow: number
}

export interface ProfitabilityRecommendation {
  type: 'amount_optimization' | 'timing' | 'route_modification' | 'risk_mitigation'
  priority: 'high' | 'medium' | 'low'
  description: string
  expectedImprovement: number
  implementationCost: number
  netBenefit: number
}

export interface SensitivityAnalysis {
  priceVolatility: Array<{ factor: number; impactOnProfit: number }>
  gasPrice: Array<{ factor: number; impactOnProfit: number }>
  slippage: Array<{ factor: number; impactOnProfit: number }>
  competition: Array<{ factor: number; impactOnProfit: number }>
  executionTime: Array<{ delaySeconds: number; impactOnProfit: number }>
}

export interface ExecutionPlan {
  id: string
  opportunity: ArbitrageOpportunity
  profitabilityAnalysis: DetailedProfitabilityAnalysis
  executionStrategy: ExecutionStrategy
  mevProtection: MEVProtectionPlan
  contingencyPlans: ContingencyPlan[]
  riskManagement: RiskManagementPlan
  timing: ExecutionTiming
  monitoring: ExecutionMonitoring
  status: ExecutionStatus
  results?: ExecutionResults
}

export interface ExecutionStrategy {
  type: 'atomic' | 'sequential' | 'parallel' | 'batched'
  description: string
  transactions: TransactionGroup[]
  totalSteps: number
  estimatedTime: number
  gasOptimization: GasOptimizationStrategy
  slippageManagement: SlippageManagementStrategy
}

export interface TransactionGroup {
  groupId: string
  transactions: any[] // Solana Transaction objects
  executionOrder: 'parallel' | 'sequential'
  dependencies: string[]
  timeout: number
  retryPolicy: RetryPolicy
  rollbackPlan?: RollbackPlan
}

export interface MEVProtectionPlan {
  strategies: MEVProtectionStrategy[]
  bundlingRequired: boolean
  privateMempoolUsed: boolean
  jitterTiming: JitterConfiguration
  frontrunProtection: FrontrunProtectionPlan
  sandwichProtection: SandwichProtectionPlan
  failsafes: MEVFailsafe[]
}

export interface MEVProtectionStrategy {
  name: string
  type: 'private_mempool' | 'flashbots' | 'timing_randomization' | 'multi_path' | 'stealth_execution'
  priority: number
  cost: number
  effectiveness: number
  conditions: string[]
  implementation: MEVImplementation
}

export interface JitterConfiguration {
  enabled: boolean
  minDelayMs: number
  maxDelayMs: number
  randomizationPattern: 'uniform' | 'exponential' | 'normal'
  adaptiveJitter: boolean
}

export interface FrontrunProtectionPlan {
  strategies: ('private_tx' | 'commit_reveal' | 'time_lock' | 'price_bound')[]
  maxFrontrunTolerance: number
  detectionMechanisms: string[]
  counterMeasures: string[]
}

export interface SandwichProtectionPlan {
  detectionEnabled: boolean
  priceImpactThreshold: number
  liquidityBuffers: number
  emergencyExit: EmergencyExitPlan
}

export interface MEVFailsafe {
  name: string
  triggerCondition: string
  action: 'abort' | 'reroute' | 'modify_params' | 'emergency_exit'
  cost: number
  probability: number
}

export interface ContingencyPlan {
  scenario: string
  probability: number
  triggerConditions: TriggerCondition[]
  response: ContingencyResponse
  fallbackOptions: FallbackOption[]
}

export interface TriggerCondition {
  type: 'price_movement' | 'liquidity_change' | 'competition' | 'gas_spike' | 'execution_failure'
  threshold: number
  timeWindow: number
  priority: number
}

export interface ContingencyResponse {
  action: 'abort' | 'modify' | 'delay' | 'switch_route'
  modifications?: ParameterModification[]
  delayMs?: number
  alternativeRoute?: ArbitrageOpportunity
}

export interface ParameterModification {
  parameter: 'amount' | 'slippage' | 'gas_price' | 'timeout'
  newValue: number
  reason: string
}

export interface FallbackOption {
  description: string
  costImpact: number
  successProbability: number
  implementation: () => Promise<void>
}

export interface RiskManagementPlan {
  maxLossThreshold: number
  stopLossConditions: StopLossCondition[]
  positionSizing: PositionSizingStrategy
  diversification: DiversificationStrategy
  monitoring: RiskMonitoringConfig
}

export interface StopLossCondition {
  type: 'absolute_loss' | 'percentage_loss' | 'time_based' | 'competition_based'
  threshold: number
  action: 'immediate_exit' | 'partial_exit' | 'parameter_adjustment'
}

export interface PositionSizingStrategy {
  method: 'kelly_criterion' | 'fixed_fractional' | 'volatility_scaled' | 'liquidity_based'
  parameters: Record<string, number>
  maxAllocation: number
  minAllocation: number
}

export interface DiversificationStrategy {
  maxSingleOpportunityAllocation: number
  maxPoolConcentration: number
  correlationLimits: Record<string, number>
}

export interface RiskMonitoringConfig {
  realTimeTracking: boolean
  alertThresholds: Record<string, number>
  reportingFrequency: number
  escalationProcedures: string[]
}

export interface ExecutionTiming {
  optimalExecutionWindow: TimeWindow
  marketConditionDependencies: MarketDependency[]
  competitionAwareness: CompetitionTimingStrategy
  adaptiveTiming: AdaptiveTimingConfig
}

export interface TimeWindow {
  start: Date
  end: Date
  confidence: number
  reasoning: string[]
}

export interface MarketDependency {
  factor: 'volatility' | 'volume' | 'spread' | 'liquidity'
  currentValue: number
  optimalRange: { min: number; max: number }
  impact: 'high' | 'medium' | 'low'
}

export interface CompetitionTimingStrategy {
  competitionLevel: 'low' | 'medium' | 'high' | 'extreme'
  avoidanceStrategy: 'off_peak' | 'randomization' | 'private_execution' | 'speed_optimization'
  monitoringEnabled: boolean
}

export interface AdaptiveTimingConfig {
  enabled: boolean
  learningRate: number
  historicalDataWindow: number
  adaptationTriggers: string[]
}

export interface ExecutionMonitoring {
  realTimeTracking: boolean
  progressCallbacks: ProgressCallback[]
  performanceMetrics: PerformanceMetric[]
  alertConfiguration: AlertConfiguration
  logging: LoggingConfiguration
}

export interface ProgressCallback {
  event: 'step_started' | 'step_completed' | 'step_failed' | 'opportunity_expired' | 'profit_realized'
  callback: (data: any) => void
  priority: number
}

export interface PerformanceMetric {
  name: string
  target: number
  current?: number
  tolerance: number
  criticality: 'high' | 'medium' | 'low'
}

export interface AlertConfiguration {
  channels: ('console' | 'webhook' | 'email' | 'sms')[]
  severityLevels: Record<string, string>
  rateLimiting: boolean
}

export interface LoggingConfiguration {
  level: 'debug' | 'info' | 'warn' | 'error'
  destinations: ('console' | 'file' | 'remote')[]
  structured: boolean
  retention: number
}

export type ExecutionStatus = 'planned' | 'ready' | 'executing' | 'completed' | 'failed' | 'cancelled'

export interface ExecutionResults {
  success: boolean
  actualProfit: number
  expectedProfit: number
  profitVariance: number
  executionTime: number
  gasUsed: number
  slippageEncountered: number
  mevProtectionEffective: boolean
  stepResults: StepResult[]
  performanceMetrics: Record<string, number>
  lessonsLearned: string[]
}

export interface StepResult {
  stepNumber: number
  success: boolean
  actualOutput: number
  expectedOutput: number
  executionTime: number
  gasUsed: number
  errors?: string[]
}

export interface ArbitrageStats {
  totalOpportunitiesDetected: number
  totalProfitRealized: number
  averageExecutionTime: number
  successRate: number
  mevProtectionEffectiveness: number
  riskAdjustedReturn: number
}

export interface ArbitrageManagerConfig {
  minProfitThreshold?: number
  maxRiskScore?: number
  enableMEVProtection?: boolean
  monitoringEnabled?: boolean
}

// Helper types for implementations
export interface RetryPolicy {
  maxRetries: number
  backoffStrategy: 'linear' | 'exponential' | 'fibonacci'
  baseDelayMs: number
  maxDelayMs: number
  retryConditions: string[]
}

export interface RollbackPlan {
  enabled: boolean
  triggers: string[]
  steps: RollbackStep[]
  maxRollbackTime: number
}

export interface RollbackStep {
  description: string
  transaction: any
  order: number
  dependencies: number[]
}

interface MEVImplementation {
  setup: () => Promise<void>
  execute: (transactions: any[]) => Promise<string[]>
  cleanup: () => Promise<void>
  cost: number
}

interface GasOptimizationStrategy {
  type: 'priority_fee' | 'compute_unit_limit' | 'transaction_batching' | 'account_packing'
  parameters: Record<string, number>
  expectedSavings: number
}

interface SlippageManagementStrategy {
  type: 'dynamic' | 'fixed' | 'progressive' | 'adaptive'
  baseSlippage: number
  maxSlippage: number
  adjustmentRules: SlippageAdjustmentRule[]
}

interface SlippageAdjustmentRule {
  condition: string
  adjustment: number
  priority: number
}

interface EmergencyExitPlan {
  enabled: boolean
  triggers: string[]
  exitStrategy: 'market_order' | 'limit_order' | 'partial_exit'
  maxLossAcceptable: number
}