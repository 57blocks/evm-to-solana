/**
 * Solana Connection Test
 * Run with: pnpm script scripts/test-connection.ts
 * 
 * Prerequisites: pnpm add @solana/web3.js dotenv
 */

import { Connection, clusterApiUrl } from "@solana/web3.js";

async function main() {
  console.log("🔗 Testing Solana connection...\n");

  // Test devnet connection
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  try {
    const version = await connection.getVersion();
    console.log("✅ Connected to Solana!");
    console.log("   Version:", version);

    const slot = await connection.getSlot();
    console.log("   Current Slot:", slot);

    const blockHeight = await connection.getBlockHeight();
    console.log("   Block Height:", blockHeight);

    const blockTime = await connection.getBlockTime(slot);
    console.log("   Block Time:", new Date((blockTime || 0) * 1000).toISOString());

    console.log("\n✅ Connection test passed!");
  } catch (error) {
    console.error("❌ Connection failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});

