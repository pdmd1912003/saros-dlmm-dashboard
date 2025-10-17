import { Connection } from '@solana/web3.js'
import { RPC_ENDPOINTS, RPC_CONFIG } from '@/backend/service/constants'
import { logger } from '@/backend/service/logger'

interface ConnectionAttempt {
  url: string
  lastAttempt: number
  failures: number
  isBlacklisted: boolean
}

class ConnectionManager {
  private connections: Map<string, Connection> = new Map()
  private connectionStatus: Map<string, ConnectionAttempt> = new Map()
  private requestQueue: Array<{ resolve: Function; reject: Function; request: Function }> = []
  private requestCount: number = 0
  private lastResetTime: number = Date.now()

  constructor() {
    this.initializeConnections()
  }

  private initializeConnections() {
    const allEndpoints = [RPC_ENDPOINTS.devnet, ...RPC_ENDPOINTS.fallbacks]

    allEndpoints.forEach(url => {
      try {
        const connection = new Connection(url, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: RPC_CONFIG.timeoutMs
        })
        this.connections.set(url, connection)
        this.connectionStatus.set(url, {
          url,
          lastAttempt: 0,
          failures: 0,
          isBlacklisted: false
        })
        logger.info(`✅ Initialized RPC connection: ${url}`)
      } catch (error) {
        logger.error(`❌ Failed to initialize RPC connection: ${url}`, error)
      }
    })
  }

  private rateLimitCheck(): boolean {
    const now = Date.now()
    const timeSinceReset = now - this.lastResetTime

    // Reset rate limit counter every second
    if (timeSinceReset >= 1000) {
      this.requestCount = 0
      this.lastResetTime = now
    }

    // Check if under rate limit
    return this.requestCount < RPC_CONFIG.rateLimit.requestsPerSecond
  }

  private async executeWithFallback<T>(
    operation: (connection: Connection) => Promise<T>
  ): Promise<T> {
    const availableConnections = Array.from(this.connectionStatus.values())
      .filter(status => !status.isBlacklisted)
      .sort((a, b) => a.failures - b.failures)

    if (availableConnections.length === 0) {
      throw new Error('All RPC endpoints are blacklisted')
    }

    let lastError: Error | null = null

    for (const connectionStatus of availableConnections) {
      try {
        const connection = this.connections.get(connectionStatus.url)
        if (!connection) continue

        logger.rpc.start(connectionStatus.url, 'RPC Call')

        const startTime = Date.now()
        const result = await Promise.race([
          operation(connection),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('RPC timeout')), RPC_CONFIG.timeoutMs)
          )
        ])

        // Success - reset failure count
        connectionStatus.failures = 0
        connectionStatus.lastAttempt = Date.now()

        const duration = Date.now() - startTime
        logger.rpc.success(connectionStatus.url, 'RPC Call', duration)
        return result

      } catch (error: any) {
        lastError = error
        connectionStatus.failures++
        connectionStatus.lastAttempt = Date.now()

        logger.rpc.error(connectionStatus.url, 'RPC Call', error)

        // Blacklist endpoint if too many failures
        if (connectionStatus.failures >= RPC_CONFIG.maxRetries) {
          connectionStatus.isBlacklisted = true
          console.warn(`🚫 Blacklisted RPC endpoint: ${connectionStatus.url}`)
        }

        // Handle specific error types gracefully
        if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
          console.warn(`⚠️ 403 Forbidden: ${connectionStatus.url} - This is expected in demo mode`)
          await new Promise(resolve =>
            setTimeout(resolve, RPC_CONFIG.retryDelayMs * connectionStatus.failures)
          )
        } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          console.warn(`⚠️ 401 Unauthorized: ${connectionStatus.url} - API key may be required`)
          // Don't retry 401 errors as much
          connectionStatus.failures += 2
        } else if (error.message?.includes('rate limit') || error.message?.includes('Too Many Requests')) {
          console.warn(`⚠️ Rate limited: ${connectionStatus.url} - Backing off`)
          await new Promise(resolve =>
            setTimeout(resolve, RPC_CONFIG.retryDelayMs * Math.min(connectionStatus.failures, 5))
          )
        }
      }
    }

    throw lastError || new Error('All RPC endpoints failed')
  }

  async makeRpcCall<T>(operation: (connection: Connection) => Promise<T>): Promise<T> {
    // Rate limiting
    if (!this.rateLimitCheck()) {
      console.log('⏳ Rate limit reached, queuing request...')
      return new Promise((resolve, reject) => {
        this.requestQueue.push({
          resolve,
          reject,
          request: () => this.executeWithFallback(operation)
        })
      })
    }

    this.requestCount++

    try {
      const result = await this.executeWithFallback(operation)

      // Process queue if available
      this.processQueue()

      return result
    } catch (error) {
      console.error('🚨 All RPC attempts failed:', error)
      throw error
    }
  }

  private async processQueue() {
    if (this.requestQueue.length === 0 || !this.rateLimitCheck()) {
      return
    }

    const { resolve, reject, request } = this.requestQueue.shift()!
    this.requestCount++

    try {
      const result = await request()
      resolve(result)
    } catch (error) {
      reject(error)
    }

    // Continue processing queue
    setTimeout(() => this.processQueue(), 100)
  }

  getCurrentConnection(): Connection {
    const availableConnections = Array.from(this.connectionStatus.values())
      .filter(status => !status.isBlacklisted)

    if (availableConnections.length === 0) {
      console.warn('⚠️ No available RPC connections, using first available')
      return Array.from(this.connections.values())[0]
    }

    const bestConnection = availableConnections
      .sort((a, b) => a.failures - b.failures)[0]

    return this.connections.get(bestConnection.url)!
  }

  getConnectionStatus() {
    return Array.from(this.connectionStatus.values()).map(status => ({
      url: status.url,
      failures: status.failures,
      isBlacklisted: status.isBlacklisted,
      lastAttempt: new Date(status.lastAttempt).toISOString()
    }))
  }

  // Reset blacklisted connections after some time
  resetBlacklistedConnections() {
    console.log('🔄 Resetting blacklisted RPC connections...')
    this.connectionStatus.forEach(status => {
      if (status.isBlacklisted) {
        status.isBlacklisted = false
        status.failures = 0
        console.log(`✅ Reset connection: ${status.url}`)
      }
    })
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager()

// Reset blacklisted connections every 5 minutes
setInterval(() => {
  connectionManager.resetBlacklistedConnections()
}, 5 * 60 * 1000)