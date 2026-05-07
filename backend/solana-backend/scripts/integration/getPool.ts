import "dotenv/config";
import StakingIDL from "../../idl/solana_staking.json";
import { PoolRepository } from "../../src/repositories/implementations/PoolRepository";
import { SolanaConnections } from "../../src/infrastructure/SolanaConnections";
import { CHAIN_ID } from "../../src/event-fetch/chain/chain";

/**
 * GetPool Integration Test Script
 *
 * 1. Load program address from solana_staking.json
 * 2. Initialize PoolRepository
 * 3. Call getPool(programId, poolId) for the configured pool
 * 4. Print PoolConfig + PoolState
 *
 * Usage:
 *   POOL_ID=<pool_id_pubkey> pnpm tsx scripts/integration/getPool.ts
 *   pnpm tsx scripts/integration/getPool.ts <poolId>
 */

const CHAIN_ID_VALUE = CHAIN_ID.SolanaDevnet;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

function getProgramAddress(): string {
  if (!StakingIDL.address) {
    throw new Error("solana_staking.json does not contain 'address' field");
  }
  return StakingIDL.address;
}

async function testGetPool() {
  console.log("=".repeat(80));
  console.log("GetPool Integration Test");
  console.log("=".repeat(80));

  try {
    console.log("\n[Step 1] Loading configuration...");
    const programAddress = getProgramAddress();
    console.log(`[Info] Program address: ${programAddress}`);

    const poolId = process.argv[2] || process.env.POOL_ID;
    if (!poolId) {
      throw new Error(
        "POOL_ID is required. Provide via env POOL_ID=<pool_id_pubkey> or as cli arg."
      );
    }
    console.log(`[Info] Pool ID: ${poolId}`);
    console.log(`[Info] Chain ID: ${CHAIN_ID_VALUE}`);
    console.log(`[Info] RPC URL: ${RPC_URL}`);

    console.log("\n[Step 2] Initializing Solana connections...");
    const solanaConnections = new SolanaConnections(RPC_URL);

    console.log("\n[Step 3] Creating PoolRepository...");
    const poolRepo = new PoolRepository(solanaConnections, CHAIN_ID_VALUE);

    console.log("\n[Step 4] Fetching pool from chain...");
    const startTime = Date.now();
    const { config, state } = await poolRepo.getPool(programAddress, poolId);
    const endTime = Date.now();

    console.log("\n" + "=".repeat(80));
    console.log("Pool Results");
    console.log("=".repeat(80));
    console.log(`Time taken: ${((endTime - startTime) / 1000).toFixed(2)} seconds\n`);

    console.log("PoolConfig:");
    console.log(`  Address: ${config.poolConfigAddress}`);
    console.log(`  Admin: ${config.admin}`);
    console.log(`  Pool ID: ${config.poolId}`);
    console.log(`  Staking Mint: ${config.stakingMint}`);
    console.log(`  Reward Mint: ${config.rewardMint}`);
    console.log(`  Reward Per Second: ${config.rewardPerSecond.toString()}`);
    console.log(`  Bump: ${config.bump}`);

    console.log("\nPoolState:");
    console.log(`  Address: ${state.poolStateAddress}`);
    console.log(`  Pool Config: ${state.poolConfig}`);
    console.log(`  Acc Reward Per Share: ${state.accRewardPerShare.toString()}`);
    console.log(`  Last Reward Time: ${state.lastRewardTime}`);
    console.log(`  Total Staked: ${state.totalStaked.toString()}`);
    console.log(`  Total Reward Debt: ${state.totalRewardDebt.toString()}`);
    console.log(`  Bump: ${state.bump}`);

    console.log("\n" + "=".repeat(80));
    console.log("Test completed successfully!");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n" + "=".repeat(80));
    console.error("Test failed with error:");
    console.error("=".repeat(80));
    console.error(error);
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    process.exit(1);
  }
}

testGetPool()
  .then(() => {
    console.log("\n[Info] Script execution completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[Error] Script execution failed:", error);
    process.exit(1);
  });
