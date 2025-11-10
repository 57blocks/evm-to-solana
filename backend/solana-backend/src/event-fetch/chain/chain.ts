import { BaseEvent, TransactionEventsParser } from "./event";

export class FetchingResult {
  events: BaseEvent[];
  endBlockNumber: number;

  constructor(events: BaseEvent[], endBlockNumber: number) {
    this.events = events;
    this.endBlockNumber = endBlockNumber;
  }
}

export interface EventFetcher {
  fetchEvents(
    monitorAddresses: string[],
    startBlock: number,
    eventsParser: TransactionEventsParser
  ): Promise<FetchingResult>;
}

export enum CHAIN_ID {
  // testnet
  BaseSepolia = 84532,
  ScrollSepolia = 534351,
  SolanaDevnet = 901,
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
  // mainnet
  [CHAIN_ID.Scroll]: "https://rpc.scroll.io",
  [CHAIN_ID.SolanaMainnet]: "https://api.mainnet-beta.solana.com",
};

export const SUBGRAPH_BY_CHAINS: Record<number, string> = {
  // testnet
  // Base Sepolia Testnet
  [CHAIN_ID.BaseSepolia]:
    "https://api.studio.thegraph.com/query/38092/huma-base-sepolia/version/latest/",
  [CHAIN_ID.ScrollSepolia]:
    "https://api.studio.thegraph.com/query/38092/huma-scroll-sepolia/version/latest/",
  [CHAIN_ID.Scroll]:
    "https://gateway-arbitrum.network.thegraph.com/api/SUBGRAPH_API_KEY/subgraphs/id/AHQ6VhwnEXpH3mKRVi9V9MYFuj66cwXevDcuVr2SU84",
};
