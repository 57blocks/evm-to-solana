import { SolanaEventFetcher, SolanaService, SolanaEventFetcherConfig } from "../src/event-fetch/chain/solana/solana";
import { AdminTransactionEventsParser, InitializedEvent } from "../src/event-fetch/admin/event";
import { CHAIN_ID, RPC_BY_CHAINS } from "../src/event-fetch/chain/chain";
import StakingIDL from "../src/event-fetch/solana_staking.json";

// Configuration
const START_SLOT = 416743273;
const END_SLOT = 419431493;
const CHAIN_ID_TO_USE = CHAIN_ID.SolanaDevnet; // or SolanaMainnet based on your needs

// Solana Event Fetcher Config
const config: SolanaEventFetcherConfig = {
  slotToExclusion: 32,           // Slots to exclude from the end for safety
  batchHours: 0,                 // Use 0 to enable batchDays
  batchDays: 1,                  // Fetch 1 day worth of slots at a time
  signaturesPerBatch: 1000,      // Number of signatures per API call
  maxFetchedTransactionCount: 100000, // Max transactions to fetch
  sleepTime: 2000,                // Sleep time between API calls (ms)
  slotToCheck: 2000,              // Range to check for transactions
  promiseNumberForTransactions: 10, // Parallel transaction fetches
};

async function fetchInitializedEvents() {
  console.log("🚀 Starting Initialized Event Fetcher...\n");
  console.log(`Chain ID: ${CHAIN_ID_TO_USE}`);
  console.log(`Start Slot: ${START_SLOT}`);
  console.log(`End Slot: ${END_SLOT}`);
  console.log(`Program ID: ${StakingIDL.address}\n`);

  try {
    // Initialize Solana Service
    // Use environment variable or default RPC
    const rpcUrl = RPC_BY_CHAINS[CHAIN_ID_TO_USE];
    const solanaService = new SolanaService(rpcUrl);
    
    // Initialize Event Parser for Admin Events
    const eventsParser = new AdminTransactionEventsParser(CHAIN_ID_TO_USE);
    
    // Initialize Event Fetcher
    const fetcher = new SolanaEventFetcher(
      CHAIN_ID_TO_USE,
      solanaService,
      START_SLOT,     // defaultStartBlock
      10000,          // maxCount - maximum events to return
      config,
      null as any     // transferEventFetcher - not needed for admin events
    );

    // Monitor the program address for events
    const monitorAddresses = [StakingIDL.address];

    console.log("📡 Fetching events...");
    console.log(`This may take a while for ${END_SLOT - START_SLOT} slots...\n`);

    // Fetch events
    const result = await fetcher.fetchEvents(
      monitorAddresses,
      START_SLOT,
      eventsParser,
      END_SLOT
    );

    console.log(`\n✅ Fetching completed!`);
    console.log(`Total events found: ${result.events.length}`);
    console.log(`Last synced slot: ${result.endBlockNumber}\n`);

    // Filter for Initialized events only
    const initializedEvents = result.events.filter(
      event => event instanceof InitializedEvent
    ) as InitializedEvent[];

    console.log(`🎯 Initialized Events: ${initializedEvents.length}\n`);

    // Log each initialized event
    if (initializedEvents.length === 0) {
      console.log("⚠️  No initialized events found in this range.");
    } else {
      console.log("=" .repeat(80));
      initializedEvents.forEach((event, index) => {
        console.log(`\n📋 Initialized Event #${index + 1}:`);
        console.log("-".repeat(80));
        console.log(`Transaction: ${event.transactionHash}`);
        console.log(`Slot: ${event.blockNumber}`);
        console.log(`Timestamp: ${new Date(event.timestamp * 1000).toISOString()}`);
        console.log(`Status: ${event.status}`);
        console.log(`\nEvent Data:`);
        console.log(`  Authority: ${event.authority}`);
        console.log(`  Staking Mint: ${event.stakingMint}`);
        console.log(`  Reward Mint: ${event.rewardMint}`);
        console.log(`  Reward Rate: ${event.rewardRate}`);
        console.log(`  Event Timestamp: ${event.timestamp}`);
        console.log("-".repeat(80));
      });
      console.log("\n" + "=".repeat(80));
    }

    // Summary statistics
    console.log("\n📊 Summary:");
    console.log(`  Slots scanned: ${END_SLOT - START_SLOT}`);
    console.log(`  Total events: ${result.events.length}`);
    console.log(`  Initialized events: ${initializedEvents.length}`);
    console.log(`  Success rate: ${initializedEvents.filter(e => e.status === 'success').length}/${initializedEvents.length}`);

    // Export to JSON if needed
    if (initializedEvents.length > 0) {
      const exportData = initializedEvents.map(event => ({
        transactionHash: event.transactionHash,
        slot: event.blockNumber,
        timestamp: event.timestamp,
        timestampISO: new Date(event.timestamp * 1000).toISOString(),
        status: event.status,
        authority: event.authority,
        stakingMint: event.stakingMint,
        rewardMint: event.rewardMint,
        rewardRate: event.rewardRate,
      }));

      console.log("\n💾 Event data available for export:");
      console.log(JSON.stringify(exportData, null, 2));
    }

  } catch (error) {
    console.error("\n❌ Error fetching initialized events:", error);
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    process.exit(1);
  }
}

// Run the script
fetchInitializedEvents()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });