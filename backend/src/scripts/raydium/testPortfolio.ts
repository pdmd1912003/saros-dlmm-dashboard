// scripts/testPortfolio.ts
import { PublicKey } from "@solana/web3.js";
import { raydiumService } from "../../service/raydium/raydiumService";

const WALLET_ADDRESS = "Fg6PaFpoGXkYsidMpWFK3bGmS7aA6V5v1sP5u6hM5wq";

async function main() {
  try {
    const owner = new PublicKey(WALLET_ADDRESS);
    await raydiumService.init(owner);
    const portfolio = await raydiumService.getPortfolio(owner);
    console.log("Portfolio summary:");
    console.log(JSON.stringify(portfolio, null, 2));
  } catch (err) {
    console.error("Error in testPortfolio:", err);
    process.exit(1);
  }
}

main();
