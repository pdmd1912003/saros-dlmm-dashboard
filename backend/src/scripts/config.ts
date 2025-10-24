import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import fs from 'fs';

export function getKeypairFromFile(filePath: string): Keypair {
    return Keypair.fromSecretKey(
        Uint8Array.from(
            JSON.parse(
                fs.readFileSync(filePath.toString(), "utf-8")
            )
        )
    );
}