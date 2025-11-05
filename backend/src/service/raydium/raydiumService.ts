import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import axios from "axios";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { LiquidityPosition, PortfolioSummary, TokenBalance } from "./types";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

let raydium: any;

async function initRaydium(owner?: PublicKey) {
    if (!raydium) {
        // load SDK (keep as any to avoid strict SDK types)
        raydium = await (Raydium as any).load({
            connection,
            owner,
            disableLoadToken: false,
            cluster: "devnet",
        });
    }
    return raydium;
}



function safeNumber(v: any, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export const raydiumService = {
    async init(owner: PublicKey) {
        return initRaydium(owner);
    },

    async getTokenBalances(owner: PublicKey): Promise<TokenBalance[]> {
        await initRaydium(owner);
        const resp = await connection.getParsedTokenAccountsByOwner(owner, {
            programId: TOKEN_PROGRAM_ID,
        });


        const balances: TokenBalance[] = [];

        for (const { account } of resp.value) {
            const parsed: any = (account as any).data?.parsed;
            if (!parsed) continue;
            const info = parsed.info;
            const mint = info.mint as string;
            const tokenAmount = info.tokenAmount || {};
            const uiAmount = safeNumber(tokenAmount.uiAmount, 0);
            const amount = safeNumber(tokenAmount.amount, 0);
            const decimals = tokenAmount.decimals ?? 0;
            if (uiAmount <= 0) continue;

            const tokenMeta = raydium?.token?.tokenMap?.get(mint) ?? null;

            balances.push({
                mint,
                amount,
                uiAmount,
                decimals,
                symbol: tokenMeta?.symbol,
                // tokenMap entries may include a price field depending on SDK; cast to any to read it safely
                price: (tokenMeta as any)?.price ?? undefined,
            });
        }

        return balances;

    },

    async getUserLiquidityPositions(owner: PublicKey): Promise<LiquidityPosition[]> {
        await initRaydium(owner);


        let allPools: any[] = [];
        try {
            const resp = await raydium?.api.getPoolList({});
            allPools = resp?.data ?? [];
        } catch (_) { }

        const positions: LiquidityPosition[] = [];

        for (const pool of allPools) {
            try {
                const lpMint = pool.lpMint;
                if (!lpMint) continue;

                const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
                    mint: new PublicKey(lpMint),
                });
                if (!tokenAccounts.value.length) continue;

                const uiAmount = safeNumber(
                    tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount,
                    0
                );
                if (uiAmount <= 0) continue;

                const tokenAInfo: any = (await (raydium as any).token.getTokenInfo([pool.tokenAMint]))?.[0] ?? {};
                const tokenBInfo: any = (await (raydium as any).token.getTokenInfo([pool.tokenBMint]))?.[0] ?? {};

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
            } catch (_) {
                continue;
            }
        }

        return positions;
    },

    async getPortfolio(owner: PublicKey): Promise<PortfolioSummary> {
        await initRaydium(owner);
        const tokens = await this.getTokenBalances(owner);
        const positions = await this.getUserLiquidityPositions(owner);

        const totalValueUsd =
            tokens.reduce((sum, t) => sum + (t.uiAmount * (t.price ?? 0)), 0) +
            positions.reduce((sum, p) => sum + p.valueUsd, 0);

        return {
            totalValueUsd,
            tokens,
            positions,
        };
    },
    
    async getTransactionHistory(owner: PublicKey, limit = 20) {
        try {
            const url = `https://api-v3.raydium.io/txs?wallet=${owner.toBase58()}&limit=${limit}`;
            const { data } = await axios.get<{ items: any[] }>(url);
            return (data.items || []).map((item: any) => ({
                txId: item.txId,
                timestamp: item.blockTime || item.timestamp || 0,
                type: (item.type as any) || "other",
                details: item,
            }));
        } catch (_) {
            return [];
        }
    },
};
