// scripts/test-dlmm-client.ts
import 'dotenv/config'
import { PublicKey } from '@solana/web3.js'
import { dlmmClient } from '@/backend/service/client'
import { sdkTracker } from '@/backend/service/sdk-tracker'
import { logger } from '@/backend/service/logger'

/**
 * ✅ Utility: Pretty-print JSON in readable format
 */
function pretty(obj: any) {
  console.log(JSON.stringify(obj, null, 2))
}

/**
 * ✅ Utility: Delay between async steps (optional)
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 🧪 Main Test Runner for DLMMClient
 */
async function testDLMMClient() {
  console.log('🚀 Starting DLMMClient test suite...\n')

  try {
    // ------------------------------------------------------
    // 1️⃣ Init environment
    // ------------------------------------------------------
    console.log('🌐 Network:', dlmmClient.getNetwork())
    console.log('🔗 RPC Endpoint:', dlmmClient.getConnection().rpcEndpoint)

    // ------------------------------------------------------
    // 2️⃣ Fetch all available DLMM pools
    // ------------------------------------------------------
    console.log('\n🔍 Fetching available DLMM pools...')
    const pairs = await dlmmClient.getAllLbPairs()
    console.log(`✅ Total pairs fetched: ${pairs.length}`)
    if (pairs.length > 0) {
      console.log('Example pair:', pairs[0].liquidityBookConfig.toString())
    } else {
      console.warn('⚠️ No pairs found — check SDK or Devnet RPC.')
      return
    }

    // ------------------------------------------------------
    // 3️⃣ Load detailed pair info
    // ------------------------------------------------------
    const targetPairAddress = new PublicKey("DFH7VBnDoJ6u8kk1zeVZ8EXsEzgx6YNMUDfcjTQ3dEFM")
    console.log('\n🔍 Loading detailed info for pair:', targetPairAddress.toString())
    const pair = await dlmmClient.getLbPair(targetPairAddress)
    if (!pair) throw new Error('Failed to load pair info')

    console.log('✅ Pair Info:')
    console.log('  - Token X:', pair.tokenMintX)
    console.log('  - Token Y:', pair.tokenMintY)
    console.log('  - Active Bin ID:', pair.activeId)
    console.log('  - Bin Step:', pair.binStep)

    // ------------------------------------------------------
    // 4️⃣ Fetch user positions (use a known Devnet wallet)
    // ------------------------------------------------------
    const demoWallet = '6uPpzrCcMRa81GA9Zdi4fD6VXHDgsxbNMT7szL3TPELu'
    const userAddress = new PublicKey(demoWallet)

    console.log('\n👤 Fetching user positions for wallet:', userAddress.toString())
    const positions = await dlmmClient.getUserPositions(userAddress, targetPairAddress)

    console.log(`✅ Found ${positions.length} positions`)
    if (positions.length > 0) {
      console.log('Example position:')
      pretty(positions[1])
    }

    // ------------------------------------------------------
    // 5️⃣ Fetch bin reserves for the first position (if available)
    // ------------------------------------------------------
    if (positions.length > 0) {
      const positionAddress = new PublicKey(positions[0].positionMint)
      console.log('\n💧 Fetching bin reserves for position:', positionAddress.toString())

      const reserves = await dlmmClient.getBinReserves({
        positionAddress,
        pairAddress: targetPairAddress,
        userAddress
      })

      console.log('✅ Bin reserves:')
      pretty(reserves)
    } else {
      console.warn('⚠️ No positions found — skipping bin reserve test.')
    }

    // ------------------------------------------------------
    // 6️⃣ Fetch bin array info (sample index = pair.activeId / 10)
    // ------------------------------------------------------
    const binArrayIndex = Math.floor(Number(pair.activeId) / 10)
    console.log('\n📦 Fetching bin array info at index:', binArrayIndex)
    const binArrayInfo = await dlmmClient.getBinArrayInfo({
      binArrayIndex,
      pairAddress: targetPairAddress,
      userAddress
    })

    console.log('✅ Bin Array Info:')
    pretty(binArrayInfo)

    // ------------------------------------------------------
    // 7️⃣ Show SDK performance metrics
    // ------------------------------------------------------
    console.log('\n📊 SDK Metrics Summary:')
    pretty(sdkTracker.getMetrics())

    console.log('\n🧠 Recent SDK Calls:')
    pretty(sdkTracker.getRecentCalls(5))

    console.log('\n🎯 DLMMClient test suite completed successfully.')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testDLMMClient().then(() => {
  console.log('\n🏁 Test script finished.')
})
