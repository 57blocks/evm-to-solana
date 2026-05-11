import { CHAIN_ID } from "../event-fetch/chain/chain";

export default () => ({
  PORT: parseInt(process.env.PORT || "3001", 10),
  DATABASE_URL: process.env.DATABASE_URL,
  EVM_RPC_URL:
    process.env.EVM_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  CHAIN_ID: Number(process.env.CHAIN_ID || CHAIN_ID.Sepolia),
  POOL_CONFIGS: process.env.POOL_CONFIGS || "[]",
  INDEXING_CRON: process.env.INDEXING_CRON || "*/15 * * * * *",
  INDEXING_RETRY_DELAY_MS: Number(process.env.INDEXING_RETRY_DELAY_MS || 1000),
  INDEXING_MAX_RETRIES: Number(process.env.INDEXING_MAX_RETRIES || 3),
  BLOCK_CHUNK_SIZE: Number(process.env.BLOCK_CHUNK_SIZE || 2000),
  CONFIRMATION_BLOCKS: Number(process.env.CONFIRMATION_BLOCKS || 5),
  POOL_BALANCE_MONITOR_CRON:
    process.env.POOL_BALANCE_MONITOR_CRON || "0 */5 * * * *",
  BALANCE_THRESHOLD: process.env.BALANCE_THRESHOLD || "1000000000000000000000",
  RESET_DB: process.env.RESET_DB || "false",
});
