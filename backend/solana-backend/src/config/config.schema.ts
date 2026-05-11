import Joi from "joi";
import StakingIDL from "../../idl/solana_staking.json";
import { CHAIN_ID } from "../event-fetch/chain/chain";

export const configSchema = Joi.object({
  PORT: Joi.number().integer().min(1).max(65535).default(3002),
  DATABASE_URL: Joi.string().required(),
  SOLANA_RPC_URL: Joi.string().uri().default("https://api.devnet.solana.com"),
  PROGRAM_ID: Joi.string().default(StakingIDL.address),
  CHAIN_ID: Joi.number().integer().default(CHAIN_ID.SolanaDevnet),
  INDEXING_CRON: Joi.string().required().default("*/10 * * * * *"),
  INDEXING_RETRY_DELAY_MS: Joi.number().integer().min(0).default(1000),
  INDEXING_MAX_RETRIES: Joi.number().integer().min(0).default(3),
  POOL_BALANCE_MONITOR_CRON: Joi.string().required().default("0 */5 * * * *"),
  REWARD_BALANCE_THRESHOLD: Joi.number().min(0).default(1000000),
  SOLSCAN_API_KEY: Joi.string().allow("").default(""),
  SOLSCAN_ENDPOINT: Joi.string().allow("").default(""),
  RESET_DB: Joi.boolean().truthy("true").falsy("false").default(false),
});
