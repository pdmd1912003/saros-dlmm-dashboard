// src/services/raydium/raydiumService.ts
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import axios from "axios";
import { Raydium } from "@raydium-io/raydium-sdk-v2";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

let raydium: any = null;
async function initRaydium(owner: PublicKey) {
  if (!raydium) {
    raydium = await (Raydium as any).load({
      connection,
      owner,
      disableLoadToken: false,
      cluster: "devnet",
    });
  }
  return raydium;
}

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

export interface FarmRewardInfo {
  farmId: string;
  stakedAmount: number;
  pendingReward: number;
  apr: number;
}

export interface TransactionHistoryItem {
  txId: string;
  timestamp: number;
  type: "swap" | "addLiquidity" | "removeLiquidity" | "other";
  details: any;
}

function safeNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const raydiumService = {
  init: initRaydium,

  async getTokenBalances(owner: PublicKey): Promise<TokenBalance[]> {
    await initRaydium(owner);
    // Use parsed token accounts to avoid manual decoding
    const resp = await connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID });
    const balances: TokenBalance[] = [];

    for (const { pubkey, account } of resp.value) {
      try {
        const parsed: any = (account as any).data?.parsed;
        if (!parsed) continue;
        const info = parsed.info;
        const mint = info.mint as string;
        const tokenAmount = info.tokenAmount || {};
        const uiAmount = safeNumber(tokenAmount.uiAmount, 0);
        const amount = safeNumber(tokenAmount.amount, 0);
        const decimals = tokenAmount.decimals ?? 0;
        if (uiAmount <= 0) continue; // skip zero balances

        const tokenMeta = raydium?.token?.tokenMap?.get(mint) ?? null;
        balances.push({
          mint,
          amount,
          uiAmount,
          decimals,
          symbol: tokenMeta?.symbol,
          price: tokenMeta?.price ?? undefined,
        });
      } catch (e) {
        // ignore malformed accounts
        continue;
      }
    }

    return balances;
  },

  async getUserLiquidityPositions(owner: PublicKey): Promise<LiquidityPosition[]> {
    await initRaydium(owner);

    // fetch pool list from Raydium API via SDK if available
    let allPools: any[] = [];
    try {
      const resp = await raydium.api.getPoolList({});
      allPools = resp?.data ?? [];
    } catch (e) {
      allPools = [];
    }

    const positions: LiquidityPosition[] = [];

    for (const pool of allPools) {
      try {
        const lpMint = pool.lpMint;
        if (!lpMint) continue;

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
          mint: new PublicKey(lpMint),
        });
        if (!tokenAccounts.value.length) continue;
        const acc = tokenAccounts.value[0];
        const uiAmount = safeNumber(acc.account.data.parsed.info.tokenAmount.uiAmount, 0);
        if (uiAmount <= 0) continue;

        const tokenAInfo = (await raydium.token.getTokenInfo([pool.tokenAMint]))?.[0] ?? {};
        const tokenBInfo = (await raydium.token.getTokenInfo([pool.tokenBMint]))?.[0] ?? {};

        const lpSupply = safeNumber(pool.lpSupply, 1);
        const yourShare = uiAmount / lpSupply;

        const baseVault = safeNumber(pool.baseVaultBalance, 0);
        const quoteVault = safeNumber(pool.quoteVaultBalance, 0);

        const tokenA_amount = yourShare * baseVault;
        const tokenB_amount = yourShare * quoteVault;

        const tokenA_ui = tokenA_amount / Math.pow(10, tokenAInfo.decimals ?? 0);
        const tokenB_ui = tokenB_amount / Math.pow(10, tokenBInfo.decimals ?? 0);

        const priceA = safeNumber(tokenAInfo.price, 0);
        const priceB = safeNumber(tokenBInfo.price, 0);

        const valueUsd = tokenA_ui * priceA + tokenB_ui * priceB;

        positions.push({
          poolId: pool.id,
          lpMint,
          tokenA: {
            mint: pool.tokenAMint,
            amount: tokenA_amount,
            uiAmount: tokenA_ui,
            decimals: tokenAInfo.decimals ?? 0,
            symbol: tokenAInfo.symbol,
            price: priceA,
          },
          tokenB: {
            mint: pool.tokenBMint,
            amount: tokenB_amount,
            uiAmount: tokenB_ui,
            decimals: tokenBInfo.decimals ?? 0,
            symbol: tokenBInfo.symbol,
            price: priceB,
          },
          yourSharePercentage: yourShare * 100,
          valueUsd,
        });
      } catch (e) {
        // skip problematic pools
        continue;
      }
    }

    return positions;
  },

  async getUserFarmRewards(owner: PublicKey): Promise<FarmRewardInfo[]> {
    await initRaydium(owner);
    const results: FarmRewardInfo[] = [];
    try {
      const farmResp = await (raydium.api.fetchFarmInfoById?.({ ids: "" }) || raydium.api.getFarmList?.());
      const farms = farmResp?.data ?? [];
      for (const farm of farms) {
        try {
          const stakeAccounts = await connection.getParsedTokenAccountsByOwner(owner, { mint: new PublicKey(farm.lpMint) });
          if (!stakeAccounts.value.length) continue;
          const staked = safeNumber(stakeAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount, 0);
          if (staked <= 0) continue;
          results.push({
            farmId: farm.id,
            stakedAmount: staked,
            pendingReward: safeNumber(farm.rewardPerShare, 0) * staked,
            apr: safeNumber(farm.apr, 0),
          });
        } catch (_) {
          continue;
        }
      }
    } catch (_) {
      return [];
    }
    return results;
  },

  async getPortfolioValue(owner: PublicKey): Promise<{ totalValueUsd: number }> {
    await initRaydium(owner);
    const positions = await this.getUserLiquidityPositions(owner);
    const balances = await this.getTokenBalances(owner);
    const valueFromPositions = positions.reduce((s, p) => s + p.valueUsd, 0);
    const valueFromTokens = balances.reduce((s, b) => s + (b.uiAmount * (b.price ?? 0)), 0);
    return { totalValueUsd: valueFromPositions + valueFromTokens };
  },

  async getTransactionHistory(owner: PublicKey, limit = 20): Promise<TransactionHistoryItem[]> {
    try {
      const url = `https://api-v3.raydium.io/txs?wallet=${owner.toBase58()}&limit=${limit}`;
      const { data } = await axios.get<{ items: any[] }>(url);
      return (data.items || []).map((item: any) => ({
        txId: item.txId,
        timestamp: item.blockTime || item.timestamp || 0,
        type: (item.type as any) || "other",
        details: item,
      }));
    } catch (e) {
      return [];
    }
  },
};

