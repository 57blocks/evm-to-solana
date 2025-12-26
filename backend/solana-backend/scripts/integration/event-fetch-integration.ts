import "dotenv/config";
import StakingIDL from "../../solana_staking.json";
import { SolanaConnections } from "../../src/infrastructure/SolanaConnections";
import { SolanaService } from "../../src/event-fetch/chain/solana/solana";
import { SolanaEventFetcher, SolanaEventFetcherConfig } from "../../src/event-fetch/chain/solana/solana";
import { PermissionlessTransactionEventsParserFactory } from "../../src/event-fetch/permissionless/event";
import {
  PermissionlessStakedEvent,
  PermissionlessUnstakedEvent,
  PermissionlessRewardsClaimedEvent,
} from "../../src/event-fetch/permissionless/event";
import { CHAIN_ID } from "../../src/event-fetch/chain/chain";

/**
 * Event Fetch Integration Test Script
 * 
 * 功能：
 * 1. 读取 solana_staking.json 文件获取程序地址
 * 2. 从区块 430369060 到当前块获取所有事件
 * 3. 打印所有解析的事件
 * 4. 验证 event-fetch 模块的功能
 * 
 * 不涉及数据库操作，只测试 event-fetch 模块的逻辑
 */

// 配置常量
const START_BLOCK = 430369060; // initialize_block
const CHAIN_ID_VALUE = CHAIN_ID.SolanaDevnet; // 可以根据需要修改为 SolanaDevnet
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const END_BLOCK = 430605379; // 0 means use current block automatically

// 获取程序地址
function getProgramAddress(): string {
  if (!StakingIDL.address) {
    throw new Error("solana_staking.json does not contain 'address' field");
  }

  console.log(`[Info] Loaded program address: ${StakingIDL.address}`);
  return StakingIDL.address;
}



// 主测试函数
async function testEventFetch() {
  console.log("=".repeat(80));
  console.log("Event Fetch Integration Test");
  console.log("=".repeat(80));

  try {
    // 1. 获取程序地址
    console.log("\n[Step 1] Loading solana_staking.json...");
    const programAddress = getProgramAddress();

    // 2. 初始化连接
    console.log("\n[Step 2] Initializing Solana connections...");
    const solanaConnections = new SolanaConnections(RPC_URL);
    const solanaService = new SolanaService(solanaConnections);
    console.log(`[Info] RPC URL: ${RPC_URL}`);
    console.log(`[Info] Chain ID: ${CHAIN_ID_VALUE}`);
    console.log(`[Info] Start block: ${START_BLOCK}`);
    console.log(`[Info] End block: ${END_BLOCK} (will use current block automatically)`);

    // 3. 创建事件解析器工厂
    console.log("\n[Step 3] Creating event parser factory...");
    const eventParserFactory = new PermissionlessTransactionEventsParserFactory();

    // 4. 创建事件解析器（使用程序地址作为 monitorAddress）
    console.log("\n[Step 4] Creating event parser...");
    const eventsParser = eventParserFactory.createTransactionEventsParser(
      CHAIN_ID_VALUE,
      [programAddress], // vaultId/monitorAddress 使用程序地址
      [
        PermissionlessStakedEvent,
        PermissionlessUnstakedEvent,
        PermissionlessRewardsClaimedEvent,
      ]
    );

    // 5. 配置 SolanaEventFetcher
    console.log("\n[Step 5] Configuring SolanaEventFetcher...");
    const fetcherConfig: SolanaEventFetcherConfig = {
      slotToExclusion: 100,
      batchHours: 1,
      batchDays: 1,
      signaturesPerBatch: 1000,
      maxFetchedTransactionCount: 10000,
      sleepTime: 1000,
      slotToCheck: 1000,
      promiseNumberForTransactions: 10,
    };

    const eventFetcher = new SolanaEventFetcher(
      CHAIN_ID_VALUE,
      solanaService,
      START_BLOCK, // defaultStartBlock
      10000, // maxCount
      fetcherConfig
    );

    // 6. 获取事件
    console.log("\n[Step 6] Fetching events...");
    console.log(`[Info] This may take a while depending on the block range...`);
    
    const startTime = Date.now();
    const result = await eventFetcher.fetchEvents(
      [programAddress], // monitorAddresses
      START_BLOCK,
      eventsParser,
      END_BLOCK // endBlock = 0 means use current block automatically
    );
    const endTime = Date.now();

    // 7. 打印结果
    console.log("\n" + "=".repeat(80));
    console.log("Fetch Results");
    console.log("=".repeat(80));
    console.log(`Total events found: ${result.events.length}`);
    console.log(`End block number: ${result.endBlockNumber}`);
    console.log(`Time taken: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);

    // 8. 打印所有事件
    if (result.events.length > 0) {
      console.log("\n" + "=".repeat(80));
      console.log("Events Details");
      console.log("=".repeat(80));
      
      result.events.forEach((event, index) => {
        console.log(`\n[Event ${index + 1}]`);
        console.log(event.toString());
      });

      // 统计事件类型
      console.log("\n" + "=".repeat(80));
      console.log("Event Type Statistics");
      console.log("=".repeat(80));
      const stats = result.events.reduce((acc, event) => {
        const type = event.constructor.name;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(stats).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    } else {
      console.log("\n[Info] No events found in the specified block range.");
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
testEventFetch()
  .then(() => {
    console.log("\n[Info] Script execution completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[Error] Script execution failed:", error);
    process.exit(1);
  });
