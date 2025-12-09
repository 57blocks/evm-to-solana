import { SolanaEventFetcher, SolanaService, SolanaEventFetcherConfig } from "../src/event-fetch/chain/solana/solana";
import { 
  PermissionlessTransactionEventsParser, 
  PermissionlessStakedEvent,
  PermissionlessUnstakedEvent,
  PermissionlessRewardsClaimedEvent,
} from "../src/event-fetch/permissionless/event";
import { CHAIN_ID, RPC_BY_CHAINS } from "../src/event-fetch/chain/chain";
import StakingIDL from "../src/event-fetch/solana_staking.json";

// Configuration
const START_SLOT = 418292081;
const END_SLOT = 0; // 0 means fetch to current slot
const CHAIN_ID_TO_USE = CHAIN_ID.SolanaDevnet; // or SolanaMainnet based on your needs

// Token mints to monitor (if needed for SPL events, can be empty array for Anchor events)
const TOKEN_MINTS: string[] = [];

// Solana Event Fetcher Config
const config: SolanaEventFetcherConfig = {
  slotToExclusion: 32,           // Slots to exclude from the end for safety
  batchHours: 0,                 // Use 0 to enable batchDays
  batchDays: 1,                  // Fetch 1 day worth of slots at a time
  signaturesPerBatch: 1000,      // Number of signatures per API call
  maxFetchedTransactionCount: 100000, // Max transactions to fetch
  sleepTime: 2000,               // Sleep time between API calls (ms)
  slotToCheck: 2000,             // Range to check for transactions
  promiseNumberForTransactions: 10, // Parallel transaction fetches
};

// Analytics helpers
interface UserAnalytics {
  userAddress: string;
  totalStaked: bigint;
  totalUnstaked: bigint;
  totalRewardsClaimed: bigint;
  netStaked: bigint;
  stakeCount: number;
  unstakeCount: number;
  rewardsClaimedCount: number;
  firstActivity: number;
  lastActivity: number;
  stakedEvents: PermissionlessStakedEvent[];
  unstakedEvents: PermissionlessUnstakedEvent[];
  rewardsClaimedEvents: PermissionlessRewardsClaimedEvent[];
}

function analyzeAllEvents(
  stakedEvents: PermissionlessStakedEvent[],
  unstakedEvents: PermissionlessUnstakedEvent[],
  rewardsClaimedEvents: PermissionlessRewardsClaimedEvent[]
): Map<string, UserAnalytics> {
  const userMap = new Map<string, UserAnalytics>();
  
  // Process staked events
  for (const event of stakedEvents) {
    const existing = userMap.get(event.userAddress) ?? {
      userAddress: event.userAddress,
      totalStaked: BigInt(0),
      totalUnstaked: BigInt(0),
      totalRewardsClaimed: BigInt(0),
      netStaked: BigInt(0),
      stakeCount: 0,
      unstakeCount: 0,
      rewardsClaimedCount: 0,
      firstActivity: event.stakeAt,
      lastActivity: event.stakeAt,
      stakedEvents: [],
      unstakedEvents: [],
      rewardsClaimedEvents: [],
    };
    
    existing.totalStaked += BigInt(event.amount);
    existing.netStaked += BigInt(event.amount);
    existing.stakeCount++;
    existing.firstActivity = Math.min(existing.firstActivity, event.stakeAt);
    existing.lastActivity = Math.max(existing.lastActivity, event.stakeAt);
    existing.stakedEvents.push(event);
    
    userMap.set(event.userAddress, existing);
  }
  
  // Process unstaked events
  for (const event of unstakedEvents) {
    const existing = userMap.get(event.userAddress) ?? {
      userAddress: event.userAddress,
      totalStaked: BigInt(0),
      totalUnstaked: BigInt(0),
      totalRewardsClaimed: BigInt(0),
      netStaked: BigInt(0),
      stakeCount: 0,
      unstakeCount: 0,
      rewardsClaimedCount: 0,
      firstActivity: event.unstakeAt,
      lastActivity: event.unstakeAt,
      stakedEvents: [],
      unstakedEvents: [],
      rewardsClaimedEvents: [],
    };
    
    existing.totalUnstaked += BigInt(event.amount);
    existing.netStaked -= BigInt(event.amount);
    existing.unstakeCount++;
    existing.firstActivity = Math.min(existing.firstActivity, event.unstakeAt);
    existing.lastActivity = Math.max(existing.lastActivity, event.unstakeAt);
    existing.unstakedEvents.push(event);
    
    userMap.set(event.userAddress, existing);
  }
  
  // Process rewards claimed events
  for (const event of rewardsClaimedEvents) {
    const existing = userMap.get(event.userAddress) ?? {
      userAddress: event.userAddress,
      totalStaked: BigInt(0),
      totalUnstaked: BigInt(0),
      totalRewardsClaimed: BigInt(0),
      netStaked: BigInt(0),
      stakeCount: 0,
      unstakeCount: 0,
      rewardsClaimedCount: 0,
      firstActivity: event.claimAt,
      lastActivity: event.claimAt,
      stakedEvents: [],
      unstakedEvents: [],
      rewardsClaimedEvents: [],
    };
    
    existing.totalRewardsClaimed += BigInt(event.amount);
    existing.rewardsClaimedCount++;
    existing.firstActivity = Math.min(existing.firstActivity, event.claimAt);
    existing.lastActivity = Math.max(existing.lastActivity, event.claimAt);
    existing.rewardsClaimedEvents.push(event);
    
    userMap.set(event.userAddress, existing);
  }
  
  return userMap;
}

async function fetchAllPermissionlessEvents() {
  console.log("🚀 Starting Permissionless Events Fetcher...\n");
  console.log(`Chain ID: ${CHAIN_ID_TO_USE}`);
  console.log(`Start Slot: ${START_SLOT}`);
  console.log(`End Slot: ${END_SLOT === 0 ? 'Current Slot' : END_SLOT}`);
  console.log(`Program ID: ${StakingIDL.address}\n`);

  try {
    // Initialize Solana Service
    const rpcUrl = RPC_BY_CHAINS[CHAIN_ID_TO_USE];
    const solanaService = new SolanaService(rpcUrl);
    
    // Get current slot if END_SLOT is 0
    let endSlot = END_SLOT;
    if (END_SLOT === 0) {
      const connection = solanaService.getConnection(CHAIN_ID_TO_USE);
      endSlot = await connection.getSlot();
      console.log(`📍 Current slot: ${endSlot}\n`);
    }
    
    // Initialize Event Parser for Permissionless Events
    const eventsParser = new PermissionlessTransactionEventsParser(
      CHAIN_ID_TO_USE,
      TOKEN_MINTS
    );
    
    // Initialize Event Fetcher
    const fetcher = new SolanaEventFetcher(
      CHAIN_ID_TO_USE,
      solanaService,
      START_SLOT,     // defaultStartBlock
      10000,          // maxCount - maximum events to return
      config,
      null as any     // transferEventFetcher - not needed for anchor events
    );

    // Monitor the program address for events
    const monitorAddresses = [StakingIDL.address];

    const slotsToScan = endSlot - START_SLOT;
    console.log("📡 Fetching events...");
    console.log(`This may take a while for ${slotsToScan.toLocaleString()} slots...`);
    console.log(`Estimated time: ~${Math.ceil(slotsToScan / (216000 * config.batchDays))} batches\n`);

    const startTime = Date.now();

    // Fetch events
    const result = await fetcher.fetchEvents(
      monitorAddresses,
      START_SLOT,
      eventsParser,
      endSlot
    );

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // seconds

    console.log(`\n✅ Fetching completed in ${duration.toFixed(2)} seconds!`);
    console.log(`Total events found: ${result.events.length}`);
    console.log(`Last synced slot: ${result.endBlockNumber}\n`);

    // Filter events by type
    const stakedEvents = result.events.filter(
      event => event instanceof PermissionlessStakedEvent
    ) as PermissionlessStakedEvent[];
    
    const unstakedEvents = result.events.filter(
      event => event instanceof PermissionlessUnstakedEvent
    ) as PermissionlessUnstakedEvent[];
    
    const rewardsClaimedEvents = result.events.filter(
      event => event instanceof PermissionlessRewardsClaimedEvent
    ) as PermissionlessRewardsClaimedEvent[];

    console.log(`🎯 Event Summary:`);
    console.log(`  Staked Events: ${stakedEvents.length}`);
    console.log(`  Unstaked Events: ${unstakedEvents.length}`);
    console.log(`  Rewards Claimed Events: ${rewardsClaimedEvents.length}`);
    console.log(`  Total Permissionless Events: ${stakedEvents.length + unstakedEvents.length + rewardsClaimedEvents.length}\n`);

    // Display sample events from each type
    console.log("=".repeat(80));
    
    // Show staked events
    if (stakedEvents.length > 0) {
      console.log(`\n💰 STAKED EVENTS (showing first 3):`);
      console.log("-".repeat(80));
      stakedEvents.slice(0, 3).forEach((event, index) => {
        console.log(`\n#${index + 1} Transaction: ${event.transactionHash}`);
        console.log(`  Slot: ${event.blockNumber}`);
        console.log(`  User: ${event.userAddress.slice(0, 8)}...${event.userAddress.slice(-6)}`);
        console.log(`  Amount: ${event.amount.toLocaleString()}`);
        console.log(`  Stake At: ${new Date(event.stakeAt * 1000).toISOString()}`);
        console.log(`  Status: ${event.status}`);
      });
      if (stakedEvents.length > 3) {
        console.log(`\n... and ${stakedEvents.length - 3} more staked events`);
      }
    }
    
    // Show unstaked events
    if (unstakedEvents.length > 0) {
      console.log(`\n\n💸 UNSTAKED EVENTS (showing first 3):`);
      console.log("-".repeat(80));
      unstakedEvents.slice(0, 3).forEach((event, index) => {
        console.log(`\n#${index + 1} Transaction: ${event.transactionHash}`);
        console.log(`  Slot: ${event.blockNumber}`);
        console.log(`  User: ${event.userAddress.slice(0, 8)}...${event.userAddress.slice(-6)}`);
        console.log(`  Amount: ${event.amount.toLocaleString()}`);
        console.log(`  Rewards: ${event.rewards.toLocaleString()}`);
        console.log(`  Unstake At: ${new Date(event.unstakeAt * 1000).toISOString()}`);
        console.log(`  Status: ${event.status}`);
      });
      if (unstakedEvents.length > 3) {
        console.log(`\n... and ${unstakedEvents.length - 3} more unstaked events`);
      }
    }
    
    // Show rewards claimed events
    if (rewardsClaimedEvents.length > 0) {
      console.log(`\n\n🎁 REWARDS CLAIMED EVENTS (showing first 3):`);
      console.log("-".repeat(80));
      rewardsClaimedEvents.slice(0, 3).forEach((event, index) => {
        console.log(`\n#${index + 1} Transaction: ${event.transactionHash}`);
        console.log(`  Slot: ${event.blockNumber}`);
        console.log(`  User: ${event.userAddress.slice(0, 8)}...${event.userAddress.slice(-6)}`);
        console.log(`  Rewards: ${event.amount.toLocaleString()}`);
        console.log(`  Claim At: ${new Date(event.claimAt * 1000).toISOString()}`);
        console.log(`  Status: ${event.status}`);
      });
      if (rewardsClaimedEvents.length > 3) {
        console.log(`\n... and ${rewardsClaimedEvents.length - 3} more rewards claimed events`);
      }
    }
    
    console.log("\n" + "=".repeat(80));

    // Analytics
    if (stakedEvents.length > 0 || unstakedEvents.length > 0 || rewardsClaimedEvents.length > 0) {
      console.log("\n📊 Comprehensive Analytics:\n");
      
      const userAnalytics = analyzeAllEvents(stakedEvents, unstakedEvents, rewardsClaimedEvents);
      
      const totalStaked = Array.from(userAnalytics.values())
        .reduce((sum, user) => sum + user.totalStaked, BigInt(0));
      const totalUnstaked = Array.from(userAnalytics.values())
        .reduce((sum, user) => sum + user.totalUnstaked, BigInt(0));
      const totalRewardsClaimed = Array.from(userAnalytics.values())
        .reduce((sum, user) => sum + user.totalRewardsClaimed, BigInt(0));
      const totalNetStaked = Array.from(userAnalytics.values())
        .reduce((sum, user) => sum + user.netStaked, BigInt(0));
      
      console.log("Protocol Summary:");
      console.log(`  Total Unique Users: ${userAnalytics.size}`);
      console.log(`  Total Staked: ${totalStaked.toString()}`);
      console.log(`  Total Unstaked: ${totalUnstaked.toString()}`);
      console.log(`  Net Staked (Current TVL): ${totalNetStaked.toString()}`);
      console.log(`  Total Rewards Claimed: ${totalRewardsClaimed.toString()}`);
      console.log(`  Average Net Stake per User: ${userAnalytics.size > 0 ? (totalNetStaked / BigInt(userAnalytics.size)).toString() : '0'}`);
      
      // Top users by net staked
      const topUsers = Array.from(userAnalytics.values())
        .sort((a, b) => Number(b.netStaked - a.netStaked))
        .slice(0, 10);
      
      console.log(`\n🏆 Top 10 Users (by Net Staked):`);
      console.log("-".repeat(80));
      topUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.userAddress.slice(0, 12)}...${user.userAddress.slice(-6)}`);
        console.log(`   Total Staked: ${user.totalStaked.toString()}`);
        console.log(`   Total Unstaked: ${user.totalUnstaked.toString()}`);
        console.log(`   Net Staked: ${user.netStaked.toString()}`);
        console.log(`   Rewards Claimed: ${user.totalRewardsClaimed.toString()}`);
        console.log(`   Activity: ${user.stakeCount} stakes, ${user.unstakeCount} unstakes, ${user.rewardsClaimedCount} claims`);
        console.log(`   First Activity: ${new Date(user.firstActivity * 1000).toISOString()}`);
        console.log(`   Last Activity: ${new Date(user.lastActivity * 1000).toISOString()}`);
        console.log();
      });
      
      // Top reward earners
      const topRewardEarners = Array.from(userAnalytics.values())
        .filter(u => u.totalRewardsClaimed > BigInt(0))
        .sort((a, b) => Number(b.totalRewardsClaimed - a.totalRewardsClaimed))
        .slice(0, 5);
      
      if (topRewardEarners.length > 0) {
        console.log(`\n💎 Top 5 Reward Earners:`);
        console.log("-".repeat(80));
        topRewardEarners.forEach((user, index) => {
          console.log(`${index + 1}. ${user.userAddress.slice(0, 12)}...${user.userAddress.slice(-6)}`);
          console.log(`   Total Rewards: ${user.totalRewardsClaimed.toString()}`);
          console.log(`   Claims: ${user.rewardsClaimedCount}`);
          console.log();
        });
      }
      
      // Activity distribution
      const activityByDate = new Map<string, { stakes: number; unstakes: number; claims: number }>();
      
      stakedEvents.forEach(event => {
        const date = new Date(event.stakeAt * 1000).toISOString().split('T')[0];
        const existing = activityByDate.get(date) ?? { stakes: 0, unstakes: 0, claims: 0 };
        existing.stakes++;
        activityByDate.set(date, existing);
      });
      
      unstakedEvents.forEach(event => {
        const date = new Date(event.unstakeAt * 1000).toISOString().split('T')[0];
        const existing = activityByDate.get(date) ?? { stakes: 0, unstakes: 0, claims: 0 };
        existing.unstakes++;
        activityByDate.set(date, existing);
      });
      
      rewardsClaimedEvents.forEach(event => {
        const date = new Date(event.claimAt * 1000).toISOString().split('T')[0];
        const existing = activityByDate.get(date) ?? { stakes: 0, unstakes: 0, claims: 0 };
        existing.claims++;
        activityByDate.set(date, existing);
      });
      
      console.log(`\n📅 Daily Activity (last 7 days):`);
      console.log("-".repeat(80));
      const sortedDates = Array.from(activityByDate.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 7);
      
      sortedDates.forEach(([date, activity]) => {
        console.log(`${date}: ${activity.stakes} stakes | ${activity.unstakes} unstakes | ${activity.claims} claims`);
      });
    }

    // Summary statistics
    const totalPermissionlessEvents = stakedEvents.length + unstakedEvents.length + rewardsClaimedEvents.length;
    console.log("\n📈 Execution Summary:");
    console.log(`  Slots scanned: ${slotsToScan.toLocaleString()}`);
    console.log(`  Total events found: ${result.events.length}`);
    console.log(`  Permissionless events: ${totalPermissionlessEvents}`);
    console.log(`    - Staked: ${stakedEvents.length}`);
    console.log(`    - Unstaked: ${unstakedEvents.length}`);
    console.log(`    - Rewards Claimed: ${rewardsClaimedEvents.length}`);
    console.log(`  Success rate: ${result.events.filter(e => e.status === 'success').length}/${result.events.length}`);
    console.log(`  Duration: ${duration.toFixed(2)} seconds`);
    console.log(`  Events per second: ${(totalPermissionlessEvents / duration).toFixed(2)}`);

    // Export to JSON if needed
    if (totalPermissionlessEvents > 0) {
      const exportData = {
        metadata: {
          chainId: CHAIN_ID_TO_USE,
          startSlot: START_SLOT,
          endSlot: endSlot,
          totalEvents: totalPermissionlessEvents,
          stakedCount: stakedEvents.length,
          unstakedCount: unstakedEvents.length,
          rewardsClaimedCount: rewardsClaimedEvents.length,
          fetchedAt: new Date().toISOString(),
        },
        stakedEvents: stakedEvents.map(event => ({
          type: 'Staked',
          transactionHash: event.transactionHash,
          slot: event.blockNumber,
          timestamp: event.timestamp,
          timestampISO: new Date(event.timestamp * 1000).toISOString(),
          status: event.status,
          userAddress: event.userAddress,
          amount: event.amount,
          stakeAt: event.stakeAt,
          stakeAtISO: new Date(event.stakeAt * 1000).toISOString(),
        })),
        unstakedEvents: unstakedEvents.map(event => ({
          type: 'Unstaked',
          transactionHash: event.transactionHash,
          slot: event.blockNumber,
          timestamp: event.timestamp,
          timestampISO: new Date(event.timestamp * 1000).toISOString(),
          status: event.status,
          userAddress: event.userAddress,
          amount: event.amount,
          rewards: event.rewards,
          unstakeAt: event.unstakeAt,
          unstakeAtISO: new Date(event.unstakeAt * 1000).toISOString(),
        })),
        rewardsClaimedEvents: rewardsClaimedEvents.map(event => ({
          type: 'RewardsClaimed',
          transactionHash: event.transactionHash,
          slot: event.blockNumber,
          timestamp: event.timestamp,
          timestampISO: new Date(event.timestamp * 1000).toISOString(),
          status: event.status,
          userAddress: event.userAddress,
          rewards: event.amount,
          claimAt: event.claimAt,
          claimAtISO: new Date(event.claimAt * 1000).toISOString(),
        })),
      };

      console.log("\n💾 Export Data Summary:");
      console.log(`  Total records: ${totalPermissionlessEvents}`);
      console.log(`  Staked events: ${exportData.stakedEvents.length}`);
      console.log(`  Unstaked events: ${exportData.unstakedEvents.length}`);
      console.log(`  Rewards claimed events: ${exportData.rewardsClaimedEvents.length}`);
      console.log(`\n  Sample data (first staked event):`);
      if (exportData.stakedEvents.length > 0) {
        console.log(JSON.stringify(exportData.stakedEvents[0], null, 2));
      }
      
      // Optionally write to file
      // import fs from 'fs';
      // fs.writeFileSync('permissionless-events.json', JSON.stringify(exportData, null, 2));
      // console.log('\n✅ Data exported to permissionless-events.json');
    }

  } catch (error) {
    console.error("\n❌ Error fetching permissionless events:", error);
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    process.exit(1);
  }
}

// Run the script
fetchAllPermissionlessEvents()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
