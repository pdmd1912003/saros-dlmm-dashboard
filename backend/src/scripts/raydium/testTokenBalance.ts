// scripts/testTokenBalances.ts
import { PublicKey } from "@solana/web3.js";
import { raydiumService } from "../../service/raydium/raydiumService"; // adjust path nếu cần

const WALLET_ADDRESS = "Fg6PaFpoGXkYsidMpWFK3bGmS7aA6V5v1sP5u6hM5wq";

async function main() {
  try {
    const owner = new PublicKey(WALLET_ADDRESS);
    await raydiumService.init(owner);
    const balances = await raydiumService.getTokenBalances(owner);
    console.log("Token balances:");
    console.log(JSON.stringify(balances, null, 2));
  } catch (err) {
    console.error("Error in testTokenBalances:", err);
    process.exit(1);
  }
}

main();
