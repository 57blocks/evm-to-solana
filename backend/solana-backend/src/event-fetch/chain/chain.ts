import { BaseEvent, TransactionEventsParser } from "./event";

export class FetchingResult {
  events: BaseEvent[];
  endBlockNumber: number;

  constructor(events: BaseEvent[], endBlockNumber: number) {
    this.events = events;
    this.endBlockNumber = endBlockNumber;
  }
}

export type FetchEventsBatchHandler = (
  result: FetchingResult
) => Promise<void> | void;

export interface EventFetcher {
  fetchEvents(
    monitorAddresses: string[],
    startBlock: number,
    eventsParser: TransactionEventsParser,
    endBlock?: number,
    onBatchFetched?: FetchEventsBatchHandler
  ): Promise<FetchingResult>;
}

export enum CHAIN_ID {
  // testnet
  BaseSepolia = 84532,
  ScrollSepolia = 534351,
  SolanaDevnet = 901,
  SolanaTestnet = 902,
  // mainnet
  Scroll = 534352,
  SolanaMainnet = 900,
}

export const RPC_BY_CHAINS: Record<number, string> = {
  // testnet
  // Base Sepolia Testnet
  [CHAIN_ID.BaseSepolia]: "https://sepolia.base.org",
  // Scroll Sepolia Testnet
  [CHAIN_ID.ScrollSepolia]: "https://sepolia-rpc.scroll.io",
  [CHAIN_ID.SolanaDevnet]: "https://api.devnet.solana.com",
  // Solana Testnet
  [CHAIN_ID.SolanaTestnet]: "https://api.testnet.solana.com",
  // mainnet
  [CHAIN_ID.Scroll]: "https://rpc.scroll.io",
  [CHAIN_ID.SolanaMainnet]: "https://api.mainnet-beta.solana.com",
};
