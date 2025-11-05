// scripts/testTxHistory.ts
import { PublicKey } from "@solana/web3.js";
import { raydiumService } from "../../service/raydium/raydiumService"; 

const WALLET_ADDRESS = "Fg6PaFpoGXkYsidMpWFK3bGmS7aA6V5v1sP5u6hM5wq";
const LIMIT = 20;

async function main() {
  try {
    const owner = new PublicKey(WALLET_ADDRESS);
    await raydiumService.init(owner);
    const txs = await raydiumService.getTransactionHistory(owner, LIMIT);
    console.log(`Last ${txs.length} transactions:`);
    console.log(JSON.stringify(txs, null, 2));
  } catch (err) {
    console.error("Error in testTxHistory:", err);
    process.exit(1);
  }
}

main();
