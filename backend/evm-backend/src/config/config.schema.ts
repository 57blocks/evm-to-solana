import Joi from "joi";
import { CHAIN_ID } from "../event-fetch/chain/chain";

export const configSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  EVM_RPC_URL: Joi.string().uri().default("https://ethereum-sepolia-rpc.publicnode.com"),
  CHAIN_ID: Joi.number().integer().default(CHAIN_ID.Sepolia),
  POOL_CONFIGS: Joi.string().required(),
  INDEXING_CRON: Joi.string().required().default("*/15 * * * * *"),
  INDEXING_RETRY_DELAY_MS: Joi.number().integer().min(0).default(1000),
  INDEXING_MAX_RETRIES: Joi.number().integer().min(0).default(3),
  BLOCK_CHUNK_SIZE: Joi.number().integer().min(1).default(2000),
  CONFIRMATION_BLOCKS: Joi.number().integer().min(0).default(5),
  POOL_BALANCE_MONITOR_CRON: Joi.string().required().default("0 */5 * * * *"),
  BALANCE_THRESHOLD: Joi.string()
    .pattern(/^[0-9]+$/)
    .default("1000000000000000000000"),
  RESET_DB: Joi.boolean().truthy("true").falsy("false").default(false),
});
