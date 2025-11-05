// scripts/runAll.ts
import { PublicKey } from "@solana/web3.js";
import { raydiumService } from "../../service/raydium/raydiumService"; 

const WALLET_ADDRESS = "Fg6PaFpoGXkYsidMpWFK3bGmS7aA6V5v1sP5u6hM5wq";

async function main() {
  try {
    const owner = new PublicKey(WALLET_ADDRESS);
    await raydiumService.init(owner);

    console.log("=== Token Balances ===");
    const balances = await raydiumService.getTokenBalances(owner);
    console.log(JSON.stringify(balances, null, 2));

    console.log("\n=== Liquidity Positions ===");
    const positions = await raydiumService.getUserLiquidityPositions(owner);
    console.log(JSON.stringify(positions, null, 2));

    console.log("\n=== Portfolio Summary ===");
    const portfolio = await raydiumService.getPortfolio(owner);
    console.log(JSON.stringify(portfolio, null, 2));

    console.log("\n=== Transaction History ===");
    const txs = await raydiumService.getTransactionHistory(owner, 20);
    console.log(JSON.stringify(txs, null, 2));

  } catch (err) {
    console.error("Error in runAll:", err);
    process.exit(1);
  }
}

main();
