// Using actual SDK v1.4.0 capabilities with better architecture
// Cache buster: IMPROVED_SDK_USAGE_${Date.now()}

import { Connection, PublicKey } from '@solana/web3.js'
import {
    LiquidityBookServices,
    MODE,
    type Pair,
    type PositionInfo,
    type AddLiquidityIntoPositionParams,
    type RemoveMultipleLiquidityParams,
    type RemoveMultipleLiquidityResponse,
    type GetTokenOutputParams,
    type GetTokenOutputResponse,
    type Distribution,
    type UserPositionsParams,
    type GetBinsArrayInfoParams,
    type GetBinsReserveParams,
    type GetBinsReserveResponse,
    RemoveLiquidityType
} from '@saros-finance/dlmm-sdk'
import { sdkTracker } from '@/backend/service/sdk-tracker'
import { logger } from '../service/logger'
import { connectionManager } from './connection-manager'
import pool from '../server/db'

/**
 * Enhanced DLMM Client using SDK v1.4.0 with improved architecture
 */
export interface PairWithAddress extends Pair {
  poolAddress: string
}

export class DLMMClient {
    private network: string
    private liquidityBookServices: LiquidityBookServices
    private pairCache = new Map<string, { pair: Pair; timestamp: number }>()
    private positionCache = new Map<string, { positions: PositionInfo[]; timestamp: number }>()
    private readonly cacheDuration = 30_000 // 30 seconds
    private connection: Connection

    constructor() {
        // ✅ Luôn dùng Devnet
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com'

        this.network = 'Devnet'
        this.connection = new Connection(rpcUrl, 'confirmed')
        this.liquidityBookServices = new LiquidityBookServices({
            mode: MODE.DEVNET,
        })

        console.log('🌐 DLMMClient initialized with Devnet RPC:', rpcUrl)
    }

    // ✅ Trả về connection Devnet luôn
    getConnection(): Connection {
        return this.connection
    }

    getNetwork(): string {
        return this.network
    }

    getLiquidityBookServices(): LiquidityBookServices {
        return this.liquidityBookServices
    }

    // ============================================================================
    // ENHANCED POOL MANAGEMENT
    // ============================================================================

    async getAllLbPairs(): Promise<PairWithAddress[]> {
        try {
            // logger.debug('🔍 Fetching all pools with enhanced SDK integration...')

            const poolAddresses = await sdkTracker.trackSDKCall(
                'fetchPoolAddresses()',
                connectionManager.getCurrentConnection().rpcEndpoint,
                async () => {
                    return await connectionManager.makeRpcCall(async () => {
                        return await this.liquidityBookServices.fetchPoolAddresses()
                    })
                }
            )

            if (!poolAddresses || poolAddresses.length === 0) {
                console.log('⚠️ No pools found from SDK, using fallback pool addresses')
            }

            logger.info('✅ Found', poolAddresses.length, 'pool addresses from SDK')

            // Load detailed pair information for each pool
            const pairs: PairWithAddress[] = []
            for (const address of poolAddresses) { // Limit to first 10 for performance
                try {
                    const pair = await this.getLbPair(new PublicKey(address))
                    if (pair) {
                        pairs.push({ ...pair, poolAddress: address })
                    }
                } catch (error) {
                    console.warn(`⚠️ Failed to load pair data for ${address}:`, (error as any)?.message)
                }
            }

            logger.info('✅ Loaded detailed data for', pairs.length, 'pools')
            return pairs

        } catch (error) {
            console.error('❌ Error fetching pools:', error);
            return [];
        }
    }

    async getLbPair(poolAddress: PublicKey): Promise<Pair | null> {
        const poolId = poolAddress.toString()

        try {
            const cached = this.pairCache.get(poolId)
            if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
                logger.cache.hit(poolId, 'pair')
                return cached.pair
            }

            logger.cache.miss(poolId, 'pair')
            console.log('🔄 Loading pair from SDK:', poolId)

            const pair = await sdkTracker.trackSDKCall(
                'getPairAccount()',
                this.connection.rpcEndpoint,
                async () => {
                    return await this.liquidityBookServices.getPairAccount(poolAddress)
                },
                { poolAddress: poolAddress.toString() }
            )

            if (!pair) {
                console.warn('⚠️ No pair data found for:', poolId)
                return null
            }

            logger.info('✅ Pair loaded successfully:', poolId)
            console.log('  Token X:', pair.tokenMintX)
            console.log('  Token Y:', pair.tokenMintY)
            console.log('  Active Bin ID:', pair.activeId)
            console.log('  Bin Step:', pair.binStep)
            console.log('  Pair:', pair)

            this.pairCache.set(poolId, { pair, timestamp: Date.now() })
            logger.cache.set(poolId, 'pair', this.cacheDuration)

            return pair
        } catch (error) {
            console.error('❌ Error loading pair:', error)
            return null
        }
    }
    async getUserPositions(
        userAddress: PublicKey,
        pairAddress?: PublicKey
    ): Promise<PositionInfo[]> {
        const userId = userAddress.toString()
        const cacheKey = pairAddress ? `${userId}-${pairAddress.toString()}` : userId

        try {
            // Check cache first
            const cached = this.positionCache.get(cacheKey)
            if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
                logger.cache.hit(cacheKey, 'positions')
                return cached.positions
            }

            logger.cache.miss(cacheKey, 'positions')

            console.log('🔄 Loading positions from SDK for user:', userId)

            let positions: PositionInfo[] = []

            if (pairAddress) {
                // Get positions for specific pair
                const userPositionsParams: UserPositionsParams = {
                    payer: userAddress,
                    pair: pairAddress
                }

                positions = await sdkTracker.trackSDKCall(
                    'getUserPositions()',
                    connectionManager.getCurrentConnection().rpcEndpoint,
                    async () => {
                        return await connectionManager.makeRpcCall(async () => {
                            return await this.liquidityBookServices.getUserPositions(userPositionsParams)
                        })
                    },
                    { userAddress: userAddress.toString(), pairAddress: pairAddress?.toString() }
                )
            } else {
                // Get positions for all pairs by iterating through available pairs
                console.log('🔄 Getting positions for all pairs - fetching available pairs first')

                try {
                    // Get all available pool addresses first
                    const poolAddresses = await sdkTracker.trackSDKCall(
                        'fetchPoolAddresses()',
                        connectionManager.getCurrentConnection().rpcEndpoint,
                        async () => {
                            return await connectionManager.makeRpcCall(async () => {
                                return await this.liquidityBookServices.fetchPoolAddresses()
                            })
                        }
                    )

                    console.log(`📊 Found ${poolAddresses?.length || 0} pool addresses, checking for user positions...`)

                    const allPositions: PositionInfo[] = []

                    if (poolAddresses && poolAddresses.length > 0) {
                        // Check first few pairs (limit to avoid too many calls)
                        const addressesToCheck = poolAddresses;

                        for (const address of addressesToCheck) {
                            try {
                                // Convert to PublicKey if it's a string
                                const pairAddress = typeof address === 'string' ? new PublicKey(address) : address

                                const userPositionsParams: UserPositionsParams = {
                                    payer: userAddress,
                                    pair: pairAddress
                                }

                                const pairPositions = await sdkTracker.trackSDKCall(
                                    `getUserPositions(${pairAddress.toString().slice(0, 8)}...)`,
                                    connectionManager.getCurrentConnection().rpcEndpoint,
                                    async () => {
                                        return await connectionManager.makeRpcCall(async () => {
                                            return await this.liquidityBookServices.getUserPositions(userPositionsParams)
                                        })
                                    },
                                    { userAddress: userAddress.toString(), pairAddress: pairAddress.toString() }
                                )

                                if (pairPositions && pairPositions.length > 0) {
                                    allPositions.push(...pairPositions)
                                    console.log(`✅ Found ${pairPositions.length} positions in pair ${pairAddress.toString().slice(0, 8)}...`)
                                }
                            } catch (error) {
                                console.warn(`⚠️ Error checking positions for pair:`, error)
                                // Continue to next pair
                            }
                        }
                    }

                    positions = allPositions
                    console.log(`📊 Total positions found: ${positions.length}`)

                } catch (error) {
                    console.error('❌ Error fetching positions across pairs:', error)
                    positions = []
                }
            }

            logger.info('✅ Loaded', positions.length, 'positions for user:', userId)

            // Transform SDK positions to our internal format
            const transformedPositions = positions.map(pos => ({
                ...pos,
                // Add any additional transformations needed
                id: pos.positionMint, // Add ID field for UI
                pairAddress: pos.pair
            }))

            // Cache the positions
            this.positionCache.set(cacheKey, {
                positions: transformedPositions,
                timestamp: Date.now()
            })
            logger.cache.set(cacheKey, 'positions', this.cacheDuration)

            return transformedPositions
        } catch (error) {
            console.error('❌ Error loading user positions:', error)
            return []
        }
    }
    async getBinReserves(params: {
        positionAddress: PublicKey
        pairAddress: PublicKey
        userAddress: PublicKey
    }): Promise<GetBinsReserveResponse[]> {
        const { positionAddress, pairAddress, userAddress } = params;

        console.log('🔄 [Devnet] Getting bin reserves for position:', positionAddress.toString());

        try {
            const reserveParams: GetBinsReserveParams = {
                position: positionAddress,
                pair: pairAddress,
                payer: userAddress
            };

            // ✅ Dùng connection DEVNET và SDK DEVNET trực tiếp
            const result = await sdkTracker.trackSDKCall(
                'getBinsReserveInformation() [DEVNET]',
                this.connection.rpcEndpoint,
                async () => {
                    return await this.liquidityBookServices.getBinsReserveInformation(reserveParams);
                },
                {
                    pairAddress: pairAddress.toString(),
                    positionAddress: positionAddress.toString(),
                    network: this.network
                }
            );

            console.log('✅ [Devnet] Bin reserves retrieved successfully');
            return Array.isArray(result) ? result : [result];

        } catch (error) {
            console.error('❌ [Devnet] Error getting bin reserves:', error);
            return [];
        }
    }
    // async getBinLiquidity(_poolAddress: PublicKey, _userAddress: PublicKey): Promise<any[]> {
    //     try {
    //         console.log('getBinLiquidity (legacy): Redirecting to getBinArrayInfo')
    //         // This would need binArrayIndex - for now return empty
    //         return []
    //     } catch (error) {
    //         console.error('Error in legacy getBinLiquidity:', error)
    //         return []
    //     }
    // }

    /**
     * Get bin array information with proper SDK types
     */
    async getBinArrayInfo(params: {
        binArrayIndex: number;
        pairAddress: PublicKey;
        userAddress: PublicKey;
    }): Promise<any> {
        const { binArrayIndex, pairAddress, userAddress } = params;

        console.log(`🔄 [Devnet] Getting bin array info for index ${binArrayIndex}...`);

        try {
            const binArrayParams: GetBinsArrayInfoParams = {
                binArrayIndex,
                pair: pairAddress,
                payer: userAddress
            };

            const result = await sdkTracker.trackSDKCall(
                'getBinArrayInfo() [DEVNET]',
                this.connection.rpcEndpoint,
                async () => {
                    return await this.liquidityBookServices.getBinArrayInfo(binArrayParams);
                },
                {
                    pairAddress: pairAddress.toString(),
                    binArrayIndex,
                    network: this.network
                }
            );

            console.log('✅ [Devnet] Bin array info retrieved successfully');
            return result;
        } catch (error) {
            console.error('❌ [Devnet] Error getting bin array info:', error);
            throw error;
        }
    }
}

// ✅ Export instance dùng sẵn
export const dlmmClient = new DLMMClient()
