/**
 * Example demo script
 * Run with: pnpm script scripts/example.ts
 */

console.log("🚀 Running example script...");
console.log("Current time:", new Date().toISOString());

// Your script logic here
async function main() {
  console.log("✅ Example script completed!");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});

