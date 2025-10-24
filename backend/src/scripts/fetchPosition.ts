import "dotenv/config"
import { Connection, PublicKey } from "@solana/web3.js"
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk"
import { dlmmClient } from "../sdk/client"
import { sarosDLMM } from "service/saros-service/sarosService"

async function main() {
    const payer = new PublicKey("5ufkqiemfB2TrJ7pVXEaGjGP9ArXdCNgbsccLLrSvqZA");
    const position = await sarosDLMM.getUserPositions({
        payer,
        pair: new PublicKey("5ehvmfyB29RCSu1bysYGvThs6HuhEKWBPEZzi1fTd87t"),
    });
    console.log("Positions:", position)
    // const position = await sarosDLMM.getPositionAccount(new PublicKey("3ERSS5mhGMS3AwiSveXMxGmsoDiFU3NJtZCuGL6bgvg1"));
    // console.log("Position account:", position)
}
main().catch(console.error).finally(() => process.exit());
