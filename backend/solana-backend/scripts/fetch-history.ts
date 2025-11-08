/**
 * Fetch Transaction History
 * Run with: pnpm script scripts/fetch-history.ts
 * 
 * Prerequisites: pnpm add @solana/web3.js dotenv
 */

// import { Connection, PublicKey } from "@solana/web3.js";

async function main() {
  console.log("📜 Fetching transaction history...\n");

  // Uncomment and configure after adding dependencies:
  /*
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("YOUR_PROGRAM_ID");

  console.log("Program:", programId.toString());

  // Get recent transactions
  const signatures = await connection.getSignaturesForAddress(programId, {
    limit: 10,
  });

  console.log(`Found ${signatures.length} recent transactions:\n`);

  for (const sig of signatures) {
    console.log("━".repeat(50));
    console.log("Signature:", sig.signature);
    console.log("Slot:", sig.slot);
    console.log("Time:", new Date((sig.blockTime || 0) * 1000).toISOString());
    console.log("Status:", sig.err ? "❌ Failed" : "✅ Success");

    // Get transaction details
    const tx = await connection.getTransaction(sig.signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (tx?.meta?.logMessages) {
      console.log("\nLogs:");
      tx.meta.logMessages
        .filter(log => log.includes("Program log:") || log.includes("Program data:"))
        .forEach(log => console.log("  ", log));
    }
    console.log("");
  }
  */

  console.log("⚠️  Please install dependencies first:");
  console.log("   pnpm add @solana/web3.js dotenv");
  console.log("\n   Then uncomment the code in this script.");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});

