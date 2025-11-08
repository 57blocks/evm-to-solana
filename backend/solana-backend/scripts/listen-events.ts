/**
 * Listen to Program Events
 * Run with: pnpm script scripts/listen-events.ts
 * 
 * Prerequisites: pnpm add @solana/web3.js @coral-xyz/anchor dotenv
 */

// import { Connection, PublicKey } from "@solana/web3.js";
// import * as anchor from "@coral-xyz/anchor";

async function main() {
  console.log("👂 Setting up event listener...\n");

  // Uncomment and configure after adding dependencies:
  /*
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("YOUR_PROGRAM_ID");

  console.log("Listening to program:", programId.toString());
  console.log("Press Ctrl+C to stop\n");

  // Subscribe to program logs
  const subscriptionId = connection.onLogs(
    programId,
    (logs, ctx) => {
      console.log("📝 Transaction:", logs.signature);
      console.log("   Slot:", ctx.slot);
      
      logs.logs.forEach((log) => {
        if (log.includes("Program data:")) {
          console.log("   📢 Event:", log);
        } else if (log.includes("Program log:")) {
          console.log("   📋", log);
        }
      });
      console.log("");
    },
    "confirmed"
  );

  console.log("Subscription ID:", subscriptionId);
  */

  console.log("⚠️  Please install dependencies first:");
  console.log("   pnpm add @solana/web3.js @coral-xyz/anchor dotenv");
  console.log("\n   Then uncomment the code in this script.");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});

