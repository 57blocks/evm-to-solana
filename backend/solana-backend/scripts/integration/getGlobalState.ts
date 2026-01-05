import "dotenv/config";
import StakingIDL from "../../solana_staking.json";
import { GlobalStateRepository } from "../../src/repositories/implementations/GlobalStateRepository";
import { SolanaConnections } from "../../src/infrastructure/SolanaConnections";
import { CHAIN_ID } from "../../src/event-fetch/chain/chain";

/**
 * GetGlobalState Integration Test Script
 * 
 * 功能：
 * 1. 从 solana_staking.json 获取程序地址
 * 2. 初始化 GlobalStateRepository
 * 3. 调用 getGlobalState 方法获取全局状态
 * 4. 打印全局状态信息
 * 
 * 使用说明：
 * - 需要设置环境变量 SOLANA_RPC_URL（可选，默认使用 devnet）
 * - 需要设置环境变量 STAKING_MINT（质押代币的 mint 地址）
 * - 或者通过命令行参数传递：pnpm tsx scripts/integration/getGlobalState.ts <stakingMint>
 */

// 配置常量
const CHAIN_ID_VALUE = CHAIN_ID.SolanaDevnet;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const STATE_SEED = "state"; // 默认 seed

// 获取程序地址
function getProgramAddress(): string {
  if (!StakingIDL.address) {
    throw new Error("solana_staking.json does not contain 'address' field");
  }
  return StakingIDL.address;
}

// 主测试函数
async function testGetGlobalState() {
  console.log("=".repeat(80));
  console.log("GetGlobalState Integration Test");
  console.log("=".repeat(80));

  try {
    // 1. 获取程序地址
    console.log("\n[Step 1] Loading configuration...");
    const programAddress = getProgramAddress();
    console.log(`[Info] Program address: ${programAddress}`);
    
    // 2. 获取 stakingMint（从环境变量或命令行参数）
    const stakingMint = process.argv[2] || process.env.STAKING_MINT;
    if (!stakingMint) {
      throw new Error(
        "StakingMint is required. Please provide it as:\n" +
        "  - Environment variable: STAKING_MINT=<address>\n" +
        "  - Command line argument: pnpm tsx scripts/integration/getGlobalState.ts <stakingMint>"
      );
    }
    console.log(`[Info] Staking Mint: ${stakingMint}`);
    console.log(`[Info] Chain ID: ${CHAIN_ID_VALUE}`);
    console.log(`[Info] RPC URL: ${RPC_URL}`);
    console.log(`[Info] State Seed: ${STATE_SEED}`);

    // 3. 初始化 SolanaConnections
    console.log("\n[Step 2] Initializing Solana connections...");
    const solanaConnections = new SolanaConnections(RPC_URL);

    // 4. 创建 GlobalStateRepository
    console.log("\n[Step 3] Creating GlobalStateRepository...");
    const globalStateRepo = new GlobalStateRepository(
      solanaConnections,
      CHAIN_ID_VALUE
    );

    // 5. 调用 getGlobalState
    console.log("\n[Step 4] Fetching global state from chain...");
    console.log("[Info] This may take a moment...");
    
    const startTime = Date.now();
    const globalState = await globalStateRepo.getGlobalState(
      programAddress,
      stakingMint,
      STATE_SEED
    );
    const endTime = Date.now();

    // 6. 打印结果
    console.log("\n" + "=".repeat(80));
    console.log("Global State Results");
    console.log("=".repeat(80));
    console.log(`Time taken: ${((endTime - startTime) / 1000).toFixed(2)} seconds\n`);
    
    console.log("Global State Information:");
    console.log(`  Admin: ${globalState.admin}`);
    console.log(`  Staking Mint: ${globalState.stakingMint}`);
    console.log(`  Reward Mint: ${globalState.rewardMint}`);
    console.log(`  Staking Vault: ${globalState.stakingVault}`);
    console.log(`  Reward Vault: ${globalState.rewardVault}`);
    console.log(`  Reward Rate: ${globalState.rewardRate} basis points (${(globalState.rewardRate / 100).toFixed(2)}%)`);
    console.log(`  Total Staked: ${globalState.totalStaked.toString()}`);

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
testGetGlobalState()
  .then(() => {
    console.log("\n[Info] Script execution completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[Error] Script execution failed:", error);
    process.exit(1);
  });
