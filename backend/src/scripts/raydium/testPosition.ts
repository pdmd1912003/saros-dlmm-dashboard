// scripts/testPositions.ts
import { PublicKey } from "@solana/web3.js";
import { raydiumService } from "../../service/raydium/raydiumService";  

const WALLET_ADDRESS = "Fg6PaFpoGXkYsidMpWFK3bGmS7aA6V5v1sP5u6hM5wq";

async function main() {
  try {
    const owner = new PublicKey(WALLET_ADDRESS);
    await raydiumService.init(owner);
    const positions = await raydiumService.getUserLiquidityPositions(owner);
    console.log("Liquidity positions:");
    console.log(JSON.stringify(positions, null, 2));
  } catch (err) {
    console.error("Error in testPositions:", err);
    process.exit(1);
  }
}

main();
