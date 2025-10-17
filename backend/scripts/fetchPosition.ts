import "dotenv/config"
import { Connection, PublicKey } from "@solana/web3.js"
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk"
import { sarosDLMM, fetchPoolMetadata } from "../../backend/service/sarosService"
import { dlmmClient } from "../../backend/service/client"
import { findWalletPositions } from "../service/poolService"

async function main() {
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!, "confirmed")
    const newWallet = new PublicKey("6uPpzrCcMRa81GA9Zdi4fD6VXHDgsxbNMT7szL3TPELu")

    console.log("Wallet:", newWallet.toBase58())

    // Init SD

    // // Ví dụ: pool SOL/USDC trên Devnet (thay bằng đúng address pool bạn cần)
    // const POOL = new PublicKey("6qV61voxnjm8MeHVVgLMtT7F1uGdcgjsn3xo2BUtrGD3")
    // // Lấy positions của user trong pool
    // const metadata = await fetchPoolMetadata(POOL);
    // const positions = await sarosDLMM.getUserPositions({
    //     payer: newWallet,
    //     pair: POOL,
    // })

    // console.log("Positions:", positions)
    // // const positionsAccount = await sarosDLMM.getPositionAccount(new PublicKey("6XXFMoow1heEZiHBUsrKpNTVyJut5WFa3t1vc5cqybGD"));
    // // console.log("Position accounts: ", positionsAccount);

    const payer = new PublicKey("5ufkqiemfB2TrJ7pVXEaGjGP9ArXdCNgbsccLLrSvqZA");
    // const pools = await sarosDLMM.fetchPoolAddresses();
    // for(const poolAddress of pools){
    //     const position = await sarosDLMM.getUserPositions({
    //         payer,
    //         pair: new PublicKey(poolAddress),
    //     });
    //     if(position.length > 0) {
    //         console.log("Wallet added liquidity to pool: ", poolAddress);
    //     }
    // }
    // const position = await sarosDLMM.getUserPositions({
    //     payer,
    //     pair: new PublicKey("5TaKjwAnbD2jnaPyHUWy1a6WCaE2xx6nm5SkLU42f5ry"),
    // });
    // console.log("Positions:", position);

    const pairAccount = await dlmmClient.getLbPair(new PublicKey("5TaKjwAnbD2jnaPyHUWy1a6WCaE2xx6nm5SkLU42f5ry"));
    console.log("Pair account: ", pairAccount);
    pairAccount?.activeId

    // const allPairs = await dlmmClient.getAllLbPairs();
    

    // const PoolMetadata = await fetchPoolMetadata(new PublicKey("6qV61voxnjm8MeHVVgLMtT7F1uGdcgjsn3xo2BUtrGD3"));
    // console.log("Pool metadata: ", PoolMetadata);


    // console.log("Positions:", position);
    // const position = await sarosDLMM.getPositionAccount(new PublicKey("CJy6tLh3wetkj1DaQCkPQwutPMQA4LTHrZLd9Qb1PAeg"));
    // console.log("Position:", position);
    // const pairAccount = await dlmmClient.getLbPair(
    //     new PublicKey("D62TQsN4BohfsX4aaMXhcwNARVhc9Ls7wqN6YsAQKZQw")
    // )
    // console.log(pairAccount)

    // const userPositions = await findWalletPositions(
    //     "6uPpzrCcMRa81GA9Zdi4fD6VXHDgsxbNMT7szL3TPELu"
    // );
    // console.log(userPositions);

}

main().catch(console.error).finally(() => process.exit());
