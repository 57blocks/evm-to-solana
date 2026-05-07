import "dotenv/config";
import StakingIDL from "../../idl/solana_staking.json";
import { PoolRepository } from "../../src/repositories/implementations/PoolRepository";
import { UserStakePositionRepository } from "../../src/repositories/implementations/UserStakePositionRepository";
import { RewardCalculationService } from "../../src/domain-services/RewardCalculationService";
import { SolanaConnections } from "../../src/infrastructure/SolanaConnections";
import { CHAIN_ID } from "../../src/event-fetch/chain/chain";

/**
 * GetUserStakePosition Integration Test Script
 *
 * Usage:
 *   USER_ADDRESS=<addr> POOL_ID=<pool_id_pubkey> pnpm tsx scripts/integration/getUserStakePosition.ts
 *   pnpm tsx scripts/integration/getUserStakePosition.ts <userAddress> <poolId>
 */

const CHAIN_ID_VALUE = CHAIN_ID.SolanaDevnet;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

function getProgramAddress(): string {
  if (!StakingIDL.address) {
    throw new Error("solana_staking.json does not contain 'address' field");
  }
  return StakingIDL.address;
}

async function testGetUserStakePosition() {
  console.log("=".repeat(80));
  console.log("GetUserStakePosition Integration Test");
  console.log("=".repeat(80));

  try {
    console.log("\n[Step 1] Loading configuration...");
    const programAddress = getProgramAddress();
    console.log(`[Info] Program address: ${programAddress}`);

    const userAddress = process.argv[2] || process.env.USER_ADDRESS;
    const poolId = process.argv[3] || process.env.POOL_ID;

    if (!userAddress) {
      throw new Error(
        "USER_ADDRESS is required. Provide via env or first cli arg."
      );
    }
    if (!poolId) {
      throw new Error(
        "POOL_ID is required. Provide via env or second cli arg."
      );
    }

    console.log(`[Info] User Address: ${userAddress}`);
    console.log(`[Info] Pool ID: ${poolId}`);
    console.log(`[Info] Chain ID: ${CHAIN_ID_VALUE}`);
    console.log(`[Info] RPC URL: ${RPC_URL}`);

    console.log("\n[Step 2] Initializing Solana connections...");
    const solanaConnections = new SolanaConnections(RPC_URL);

    console.log("\n[Step 3] Wiring repositories...");
    const poolRepo = new PoolRepository(solanaConnections, CHAIN_ID_VALUE);
    const rewardCalculator = new RewardCalculationService();
    const userStakePositionRepo = new UserStakePositionRepository(
      solanaConnections,
      CHAIN_ID_VALUE,
      poolRepo,
      rewardCalculator
    );

    console.log("\n[Step 4] Fetching user stake position from chain...");
    const startTime = Date.now();
    const userStakeStatus = await userStakePositionRepo.getUserStakePosition(
      userAddress,
      programAddress,
      poolId
    );
    const endTime = Date.now();

    console.log("\n" + "=".repeat(80));
    console.log("User Stake Position Results");
    console.log("=".repeat(80));
    console.log(`Time taken: ${((endTime - startTime) / 1000).toFixed(2)} seconds\n`);

    if (userStakeStatus === null) {
      console.log("User Stake Status: Not Found");
    } else {
      console.log("User Stake Status: Found");
      console.log(`  User Address: ${userStakeStatus.userAddress}`);
      console.log(`  Pool Config: ${userStakeStatus.poolConfig}`);
      console.log(`  Staked Amount: ${userStakeStatus.amount.toString()}`);
      console.log(`  Reward Debt: ${userStakeStatus.rewardDebt.toString()}`);
      console.log(`  Pending Rewards: ${userStakeStatus.pendingRewards.toString()}`);
      console.log(`  Bump: ${userStakeStatus.bump}`);
    }

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

testGetUserStakePosition()
  .then(() => {
    console.log("\n[Info] Script execution completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[Error] Script execution failed:", error);
    process.exit(1);
  });
