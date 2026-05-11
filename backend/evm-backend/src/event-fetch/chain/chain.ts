import { SyncStatus } from "../../domain-models";
import { BaseEvent } from "./event";

export enum CHAIN_ID {
  Sepolia = 11155111,
}

export interface FetchingResult {
  events: BaseEvent[];
  endBlockNumber: number;
}

export type BatchHandler = (result: FetchingResult) => Promise<void>;

export interface EventFetcher {
  fetchEvents(syncStatus: SyncStatus, onBatch?: BatchHandler): Promise<FetchingResult>;
}
