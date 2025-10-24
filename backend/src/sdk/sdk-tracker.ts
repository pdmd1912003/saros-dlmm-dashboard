// SDK Call Tracking Service
// Records real SDK method calls for verification and monitoring

export interface SDKCall {
  id: string
  method: string
  timestamp: number
  duration: number
  success: boolean
  endpoint: string
  parameters?: any
  error?: string
}

export interface SDKMetrics {
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  averageLatency: number
  lastCallTime: number
  sessionStartTime: number
}

class SDKCallTracker {
  private calls: SDKCall[] = []
  private maxCalls = 50 // Keep last 50 calls
  private sessionStartTime = Date.now()
  private callIdCounter = 0

  /**
   * Track a new SDK call
   */
  trackCall(  
    method: string,
    endpoint: string,
    startTime: number,
    success: boolean,
    parameters?: any,
    error?: Error
  ) {
    const endTime = Date.now()
    const call: SDKCall = {
      id: `sdk_call_${++this.callIdCounter}`,
      method,
      timestamp: startTime, // Use actual start time for accuracy
      duration: endTime - startTime,  
      success,
      endpoint,
      parameters: parameters ? this.sanitizeParameters(parameters) : undefined,
      error: error?.message
    }

    // Add to front and maintain max size
    this.calls.unshift(call)
    if (this.calls.length > this.maxCalls) {
      this.calls = this.calls.slice(0, this.maxCalls)
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 SDK Call Tracked: ${method} - ${success ? 'SUCCESS' : 'FAILED'} (${call.duration}ms)`)
    }
  }

  /**
   * Get recent SDK calls
   */
  getRecentCalls(limit = 10): SDKCall[] {
    return this.calls.slice(0, limit)
  }

  /**
   * Get SDK metrics
   */
  getMetrics(): SDKMetrics {
    const totalCalls = this.calls.length
    const successfulCalls = this.calls.filter(call => call.success).length
    const failedCalls = totalCalls - successfulCalls

    const averageLatency = totalCalls > 0
      ? this.calls.reduce((sum, call) => sum + call.duration, 0) / totalCalls
      : 0

    const lastCallTime = this.calls.length > 0 ? this.calls[0].timestamp : this.sessionStartTime

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      averageLatency: Math.round(averageLatency),
      lastCallTime,
      sessionStartTime: this.sessionStartTime
    }
  }

  /**
   * Get total call count (including session history)
   */
  getTotalCallCount(): number {
    return this.callIdCounter
  }

  /**
   * Clear all tracking data
   */
  clear() {
    this.calls = []
    this.callIdCounter = 0
    this.sessionStartTime = Date.now()
  }

  /**
   * Helper method to wrap SDK calls for automatic tracking
   */
  async trackSDKCall<T>(
    method: string,
    endpoint: string,
    operation: () => Promise<T>,
    parameters?: any
  ): Promise<T> {
    const startTime = Date.now()

    try {
      const result = await operation()
      this.trackCall(method, endpoint, startTime, true, parameters)
      return result
    } catch (error) {
      this.trackCall(method, endpoint, startTime, false, parameters, error as Error)
      throw error
    }
  }

  /**
   * Sanitize parameters to avoid logging sensitive data
   */
  private sanitizeParameters(params: any): any {
    if (!params) return undefined

    // Create a clean copy
    const sanitized = { ...params }

    // Remove or mask sensitive fields
    if (sanitized.privateKey) delete sanitized.privateKey
    if (sanitized.secretKey) delete sanitized.secretKey
    if (sanitized.mnemonic) delete sanitized.mnemonic

    // Truncate long arrays/objects to avoid bloat
    for (const key in sanitized) {
      if (Array.isArray(sanitized[key]) && sanitized[key].length > 5) {
        sanitized[key] = `[Array of ${sanitized[key].length} items]`
      }
    }

    return sanitized
  }
}

// Global SDK tracker instance
export const sdkTracker = new SDKCallTracker()

// Helper function to format time ago
export function formatTimeAgo(timestamp: number): string {
  const secondsAgo = Math.floor((Date.now() - timestamp) / 1000)

  if (secondsAgo < 60) return `${secondsAgo}s ago`
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`
  return `${Math.floor(secondsAgo / 86400)}d ago`
}