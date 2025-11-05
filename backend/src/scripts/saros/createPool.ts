import "dotenv/config";
import { Keypair, PublicKey, Connection, sendAndConfirmTransaction  } from "@solana/web3.js";
import { LiquidityBookServices, MODE, BIN_STEP_CONFIGS } from "@saros-finance/dlmm-sdk";
import { getOrCreateAssociatedTokenAccount, getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { dlmmClient } from "../../sdk/client";
import { getKeypairFromFile } from "../config";
import os from "os";

export const CUSTOM_TOKEN_DEVNET = {
  id: "customtoken",
  mintAddress: "DwepvS8MAFHavET6eh8UfGdK6V867ar2joVqHNTqAFvY",
  decimals: 9,
  name: "CUSTOM_TOKEN",
};

export const WSOL_TOKEN_DEVNET = {
  id: "wsol",
  mintAddress: "So11111111111111111111111111111111111111112",
  symbol: "WSOL",
  name: "Wrapped SOL",
  decimals: 9,
};

// async function createPool() {
//   const connection = dlmmClient.getConnection();
//   console.log("Connection to cluster:", connection.rpcEndpoint);

//   const wallet = getKeypairFromFile(`${os.homedir()}/.config/solana/id.json`);
//   console.log("Wallet public key:", wallet.publicKey.toBase58());

//   const { blockhash } = await connection.getLatestBlockhash({ commitment: "confirmed" });

//   // 🧱 Tạo transaction tạo pool
//   const { tx, pair, binArrayLower, binArrayUpper } =
//     await dlmmClient.getLiquidityBookServices().createPairWithConfig({
//       tokenBase: {
//         decimal: CUSTOM_TOKEN_DEVNET.decimals,
//         mintAddress: CUSTOM_TOKEN_DEVNET.mintAddress,
//       },
//       tokenQuote: {
//         mintAddress: WSOL_TOKEN_DEVNET.mintAddress,
//         decimal: WSOL_TOKEN_DEVNET.decimals,
//       },
//       binStep: BIN_STEP_CONFIGS[1]?.binStep || 1,
//       ratePrice: 1,
//       payer: wallet.publicKey,
//     });

//   tx.recentBlockhash = blockhash;
//   tx.feePayer = wallet.publicKey;

//   // ✅ Ký và gửi transaction
//   // tx is created by the DLMM SDK which bundles its own copy of @solana/web3.js.
//   // That causes a TypeScript type mismatch at compile time even though at
//   // runtime the transaction object is compatible. Cast to `any` to avoid the
//   // cross-package type error while preserving runtime behavior.
//   const txid = await sendAndConfirmTransaction(connection, tx as any, [wallet], {
//     commitment: "confirmed",
//   });

//   console.log("✅ Pool created successfully!");
//   console.log("Transaction:", txid);
//   console.log("Pair address:", pair);
//   console.log("BinArrayLower:", binArrayLower);
//   console.log("BinArrayUpper:", binArrayUpper);
// }

// createPool().catch((error) => {
//   console.error("Error:", error);
// });