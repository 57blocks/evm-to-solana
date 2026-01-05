import "dotenv/config";
import StakingIDL from "../../solana_staking.json";
import { UserStakePositionRepository } from "../../src/repositories/implementations/UserStakePositionRepository";
import { SolanaConnections } from "../../src/infrastructure/SolanaConnections";
import { CHAIN_ID } from "../../src/event-fetch/chain/chain";

/**
 * GetUserStakePosition Integration Test Script
 * 
 * 功能：
 * 1. 从 solana_staking.json 获取程序地址
 * 2. 初始化 UserStakePositionRepository
 * 3. 调用 getUserStakePosition 方法获取用户质押状态
 * 4. 打印用户质押状态信息
 * 
 * 使用说明：
 * - 需要设置环境变量 SOLANA_RPC_URL（可选，默认使用 devnet）
 * - 需要设置环境变量 STAKING_MINT（质押代币的 mint 地址）
 * - 需要设置环境变量 USER_ADDRESS（用户地址）
 * - 或者通过命令行参数传递：pnpm tsx scripts/integration/getUserStakePosition.ts <userAddress> <stakingMint>
 */

// 配置常量
const CHAIN_ID_VALUE = CHAIN_ID.SolanaDevnet;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const STATE_SEED = "state"; // 默认 seed
const STAKE_SEED = "stake"; // 默认 seed

// 获取程序地址
function getProgramAddress(): string {
  if (!StakingIDL.address) {
    throw new Error("solana_staking.json does not contain 'address' field");
  }
  return StakingIDL.address;
}

// 主测试函数
async function testGetUserStakePosition() {
  console.log("=".repeat(80));
  console.log("GetUserStakePosition Integration Test");
  console.log("=".repeat(80));

  try {
    // 1. 获取程序地址
    console.log("\n[Step 1] Loading configuration...");
    const programAddress = getProgramAddress();
    console.log(`[Info] Program address: ${programAddress}`);
    
    // 2. 获取 userAddress 和 stakingMint（从环境变量或命令行参数）
    // 命令行参数格式: <userAddress> <stakingMint>
    const userAddress = process.argv[2] || process.env.USER_ADDRESS;
    const stakingMint = process.argv[3] || process.env.STAKING_MINT;
    
    if (!userAddress) {
      throw new Error(
        "UserAddress is required. Please provide it as:\n" +
        "  - Environment variable: USER_ADDRESS=<address>\n" +
        "  - Command line argument: pnpm tsx scripts/integration/getUserStakePosition.ts <userAddress> [stakingMint]"
      );
    }
    
    if (!stakingMint) {
      throw new Error(
        "StakingMint is required. Please provide it as:\n" +
        "  - Environment variable: STAKING_MINT=<address>\n" +
        "  - Command line argument: pnpm tsx scripts/integration/getUserStakePosition.ts <userAddress> <stakingMint>"
      );
    }
    
    console.log(`[Info] User Address: ${userAddress}`);
    console.log(`[Info] Staking Mint: ${stakingMint}`);
    console.log(`[Info] Chain ID: ${CHAIN_ID_VALUE}`);
    console.log(`[Info] RPC URL: ${RPC_URL}`);
    console.log(`[Info] State Seed: ${STATE_SEED}`);
    console.log(`[Info] Stake Seed: ${STAKE_SEED}`);

    // 3. 初始化 SolanaConnections
    console.log("\n[Step 2] Initializing Solana connections...");
    const solanaConnections = new SolanaConnections(RPC_URL);

    // 4. 创建 UserStakePositionRepository
    console.log("\n[Step 3] Creating UserStakePositionRepository...");
    const userStakePositionRepo = new UserStakePositionRepository(
      solanaConnections,
      CHAIN_ID_VALUE
    );

    // 5. 调用 getUserStakePosition
    console.log("\n[Step 4] Fetching user stake position from chain...");
    console.log("[Info] This may take a moment...");
    
    const startTime = Date.now();
    const userStakeStatus = await userStakePositionRepo.getUserStakePosition(
      userAddress,
      programAddress,
      stakingMint,
      STATE_SEED,
      STAKE_SEED
    );
    const endTime = Date.now();

    // 6. 打印结果
    console.log("\n" + "=".repeat(80));
    console.log("User Stake Position Results");
    console.log("=".repeat(80));
    console.log(`Time taken: ${((endTime - startTime) / 1000).toFixed(2)} seconds\n`);
    
    if (userStakeStatus === null) {
      console.log("User Stake Status: Not Found");
      console.log("\n[Info] The user has no stake position. This could mean:");
      console.log("  - The user has never staked tokens");
      console.log("  - The user has unstaked all tokens");
      console.log("  - The provided address is incorrect");
    } else {
      console.log("User Stake Status: Found");
      console.log("\nUser Stake Information:");
      console.log(`  User Address: ${userStakeStatus.userAddress}`);
      console.log(`  Staked Amount: ${userStakeStatus.amount.toString()}`);
      console.log(`  Stake Timestamp: ${userStakeStatus.stakeTimestamp}`);
      console.log(`  Last Claim Time: ${userStakeStatus.lastClaimTime}`);
      console.log(`  Reward Debt: ${userStakeStatus.rewardDebt.toString()}`);
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

// 运行测试
testGetUserStakePosition()
  .then(() => {
    console.log("\n[Info] Script execution completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[Error] Script execution failed:", error);
    process.exit(1);
  });
