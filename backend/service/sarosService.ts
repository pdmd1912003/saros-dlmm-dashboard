// sarosService.ts
import {
  Keypair,
  PublicKey,
  Transaction,
  Connection,
  Commitment,
  BlockhashWithExpiryBlockHeight,
} from "@solana/web3.js";
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";

/**
 * Cấu hình RPC (ưu tiên .env)
 */
const RPC =
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC ||
  "https://api.devnet.solana.com";

export const connection = new Connection(RPC, "confirmed" as Commitment);

/**
 * Khởi tạo SDK
 * - Bạn có thể thêm option.rpcUrl nếu muốn override (mặc định SDK có thể tự xử lý)
 */
export const sarosDLMM = new LiquidityBookServices({
  mode: MODE.DEVNET,
  options: {
    rpcUrl: RPC,
    commitmentOrConfig: "confirmed",
  },
});

/**
 * Types
 */
export interface PoolMetadata {
  pair?: string | PublicKey;
  tokenBase?: {
    symbol?: string;
    mintAddress?: string;
  };
  tokenQuote?: {
    symbol?: string;
    mintAddress?: string;
  };
  totalLiquidityUsd?: string;
  currentPrice?: string;
  // giữ nguyên mọi field khác SDK trả về
  [key: string]: any;
}

export interface FetchPoolsResult {
  pools: PoolMetadata[];
  error?: string;
}

/**
 * Basic wrapper functions (giữ tương tự service cũ của bạn)
 */

export async function fetchPoolMetadata(poolAddress: string | PublicKey) {
  try {
    // SDK chấp nhận cả string/base58 hoặc PublicKey, nhưng ta chuẩn hóa thành base58 string
    const addr =
      typeof poolAddress === "string"
        ? poolAddress
        : (poolAddress as PublicKey).toBase58();
    return await sarosDLMM.fetchPoolMetadata(addr);
  } catch (err) {
    console.error("fetchPoolMetadata error:", err);
    throw err;
  }
}

export async function fetchReserves(
  position: string,
  poolAddress: string,
  wallet: string
) {
  try {
    return await sarosDLMM.getBinsReserveInformation({
      position: new PublicKey(position),
      pair: new PublicKey(poolAddress),
      payer: new PublicKey(wallet),
    });
  } catch (err) {
    console.error("fetchReserves error:", err);
    throw err;
  }
}

export async function quoteSwap(
  pool: string,
  tokenBase: string,
  tokenQuote: string,
  amount: bigint,
  swapForY: boolean,
  tokenBaseDecimal: number,
  tokenQuoteDecimal: number,
  slippage: number
) {
  try {
    return await sarosDLMM.getQuote({
      pair: new PublicKey(pool),
      tokenBase: new PublicKey(tokenBase),
      tokenQuote: new PublicKey(tokenQuote),
      amount,
      swapForY,
      isExactInput: true,
      tokenBaseDecimal,
      tokenQuoteDecimal,
      slippage,
    });
  } catch (err) {
    console.error("quoteSwap error:", err);
    throw err;
  }
}

export async function fetchAllPools() {
  try {
    return await sarosDLMM.fetchPoolAddresses();
  } catch (err) {
    console.error("fetchAllPools error:", err);
    throw err;
  }
}

export async function fetchPools(limit = 20): Promise<FetchPoolsResult> {
  try {
    const addresses = await sarosDLMM.fetchPoolAddresses();
    if (!addresses || addresses.length === 0) return { pools: [] };

    const slice = addresses
      .slice(0, limit)
      .map((a: any) => (typeof a === "string" ? new PublicKey(a) : a))
      .filter(Boolean) as PublicKey[];

    const metadataPromises = slice.map(async (addr: PublicKey) => {
      try {
        // fetchPoolMetadata chấp nhận base58 string
        const metadata: any = await sarosDLMM.fetchPoolMetadata(
          addr.toBase58()
        );

        // đảm bảo có pair (chuỗi)
        const out: PoolMetadata = {
          ...(metadata || {}),
          pair: addr.toBase58(),
          // nếu SDK không trả totalLiquidityUsd/currentPrice, ta có thể leave undefined hoặc để mock nhỏ
          totalLiquidityUsd: metadata?.totalLiquidityUsd ?? undefined,
          currentPrice: metadata?.currentPrice ?? undefined,
        };

        return out;
      } catch (err) {
        console.error(`Failed to fetch metadata for ${addr.toBase58()}:`, err);
        return null;
      }
    });

    const metadataResults = await Promise.allSettled(metadataPromises);
    const validPools = metadataResults
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean) as PoolMetadata[];

    return { pools: validPools };
  } catch (err) {
    console.error("fetchPools error:", err);
    return {
      pools: [],
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}

export async function fetchUserPositions(payer: PublicKey) {
  try {
    const allAddresses = await sarosDLMM.fetchPoolAddresses();
    if (!allAddresses || allAddresses.length === 0) return [];

    const pairsToFetch: PublicKey[] = (allAddresses || [])
      .map((a: any) => (typeof a === "string" ? new PublicKey(a) : a))
      .filter(Boolean);

    const allUserPositions: any[] = [];
    for (const pair of pairsToFetch) {
      try {
        const positions = await sarosDLMM.getUserPositions({
          payer,
          pair,
        });

        if (positions && positions.length > 0) {
          const enrichedPositions = positions.map((p: any) => ({
            ...p,
            poolAddress: pair.toBase58(),
            positionMint: p.positionMint?.toBase58(),
            liquidityShares: p.liquidityShares?.map((bn: any) => bn.toString()),
            lowerBinId: p.lowerBinId,
            upperBinId: p.upperBinId,
          }));

          allUserPositions.push(...enrichedPositions);
        }
      } catch (innerErr) {
        console.warn(
          `⚠️ Failed to fetch positions for pool ${pair.toBase58()}:`,
          innerErr
        );
      }
    }

    return allUserPositions;
  } catch (err) {
    console.error("❌ fetchUserPositions error:", err);
    return [];
  }
}

/**
 * createPositionOnChain:
 * - Tạo Keypair mint cho position (caller sẽ partialSign và sign tx)
 * - Trả về transaction đã build (chưa được sign bởi payer), positionMintPublicKey, và response SDK
 */
export async function createPositionOnChain(opts: {
  payer: PublicKey;
  pairAddress: string | PublicKey;
  relativeBinIdLeft: number;
  relativeBinIdRight: number;
}) {
  const { payer, pairAddress, relativeBinIdLeft, relativeBinIdRight } = opts;
  const pair =
    typeof pairAddress === "string" ? new PublicKey(pairAddress) : pairAddress;
  const positionMintKP = Keypair.generate();

  try {
    const blockhashObj: BlockhashWithExpiryBlockHeight =
      await connection.getLatestBlockhash("confirmed");

    const tx = new Transaction({
      recentBlockhash: blockhashObj.blockhash,
      feePayer: payer,
    });

    const sdkResult = await sarosDLMM.createPosition({
      payer,
      relativeBinIdLeft,
      relativeBinIdRight,
      pair,
      binArrayIndex: 0,
      positionMint: positionMintKP.publicKey,
      transaction: tx,
    } as any);

    // partial sign position mint keypair (SDK thường yêu cầu)
    tx.partialSign(positionMintKP);

    return {
      tx,
      positionMintPublicKey: positionMintKP.publicKey,
      sdkResponse: sdkResult,
      blockhash: blockhashObj.blockhash,
      lastValidBlockHeight: blockhashObj.lastValidBlockHeight,
    };
  } catch (err) {
    console.error("❌ createPositionOnChain error:", err);
    throw err;
  }
}

/**
 * createPositionOnChainAlternative:
 * - 1 biến thể (giữ tương tự ví dụ bạn đưa)
 */
export async function createPositionOnChainAlternative(opts: {
  payer: PublicKey;
  pairAddress: string | PublicKey;
  relativeBinIdLeft: number;
  relativeBinIdRight: number;
}) {
  const { payer, pairAddress, relativeBinIdLeft, relativeBinIdRight } = opts;
  const pair =
    typeof pairAddress === "string" ? new PublicKey(pairAddress) : pairAddress;
  const positionMintKP = Keypair.generate();

  try {
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: payer,
    });

    const result = await sarosDLMM.createPosition({
      payer,
      relativeBinIdLeft,
      relativeBinIdRight,
      pair,
      binArrayIndex: 0,
      positionMint: positionMintKP.publicKey,
      transaction: tx,
    } as any);

    if (!result || !result.position) {
      throw new Error("SDK did not return position information");
    }

    tx.partialSign(positionMintKP);

    return {
      tx,
      positionMintPublicKey: positionMintKP.publicKey,
      sdkResponse: result,
    };
  } catch (err) {
    console.error("❌ createPositionOnChainAlternative error:", err);
    throw err;
  }
}

/**
 * sendTransaction helper:
 * - signTransaction: function provided bởi wallet adapter của bạn (ex: wallet.signTransaction)
 * - gửi raw tx và xác nhận
 */
export async function sendTransaction(
  tx: Transaction,
  signTransaction: (tx: Transaction) => Promise<Transaction>
) {
  try {
    const signedTx = await signTransaction(tx);

    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    const confirmation = await connection.confirmTransaction(signature, "confirmed");

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    return signature;
  } catch (err) {
    console.error("❌ sendTransaction error:", err);
    throw err;
  }
}

/**
 * Xuất các hàm phổ biến
 */
export default {
  connection,
  sarosDLMM,
  fetchUserPositions,
  fetchPoolMetadata,
  fetchReserves,
  quoteSwap,
  fetchAllPools,
  fetchPools,
  createPositionOnChain,
  createPositionOnChainAlternative,
  sendTransaction,
};
