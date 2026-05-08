import StakingIDL from "../../idl/solana_staking.json";
import { CHAIN_ID } from "../event-fetch/chain/chain";

export default () => ({
  DATABASE_URL: process.env.DATABASE_URL,
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  PROGRAM_ID: process.env.PROGRAM_ID || StakingIDL.address,
  CHAIN_ID: Number(process.env.CHAIN_ID || CHAIN_ID.SolanaDevnet),
  INDEXING_CRON: process.env.INDEXING_CRON || "*/10 * * * * *",
  INDEXING_RETRY_DELAY_MS: Number(process.env.INDEXING_RETRY_DELAY_MS || 1000),
  INDEXING_MAX_RETRIES: Number(process.env.INDEXING_MAX_RETRIES || 3),
  POOL_BALANCE_MONITOR_CRON:
    process.env.POOL_BALANCE_MONITOR_CRON || "0 */5 * * * *",
  REWARD_BALANCE_THRESHOLD: Number(process.env.REWARD_BALANCE_THRESHOLD || 1000000),
  SOLSCAN_API_KEY: process.env.SOLSCAN_API_KEY || "",
  SOLSCAN_ENDPOINT: process.env.SOLSCAN_ENDPOINT || "",
});
