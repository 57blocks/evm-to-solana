import axios from "axios";
import { BaseEvent } from "../event";
import { SolanaService } from "./solana";
import { PermissionlessSPLTransferEvent } from "../../permissionless/event";
import { mergeSortedArrays, sleep } from "../../common";

const PAGE_SIZE = 100;

export type SolscanTransferEventFetcherConfig = {
  endpoint: string;
  maxRetries: number;
  timeout: number;
  batchSize: number;
};

export interface TokenTransfer {
  block_id: number;
  trans_id: string;
  block_time: number;
  time: string;
  activity_type: string;
  from_address: string;
  to_address: string;
  from_token_account?: string;
  to_token_account?: string;
  token_address: string;
  token_decimals: number;
  amount: number;
  value?: number;
}

export interface TokenTransferResponse {
  success: boolean;
  data: TokenTransfer[];
}

export class SolscanTransferEventFetcher {
  private chainId: number;
  private solanaService: SolanaService;
  private config: SolscanTransferEventFetcherConfig;
  private apiKey: string;

  constructor(
    chainId: number,
    solanaService: SolanaService,
    apiKey: string,
    config: SolscanTransferEventFetcherConfig
  ) {
    this.chainId = chainId;
    this.solanaService = solanaService;
    this.config = config;
    this.apiKey = apiKey;
  }

  async fetchEvents(
    tokenMintAddresses: string[],
    startBlock: number,
    endBlock: number
  ) {
    const connection = this.solanaService.getConnection(this.chainId);
    const [blockStartTime, blockEndTime] = await Promise.all([
      connection.getBlockTime(startBlock),
      connection.getBlockTime(endBlock),
    ]);
    if (
      blockStartTime === null ||
      blockEndTime === null ||
      blockEndTime < blockStartTime
    ) {
      throw new Error("Fetch transfer events failed: Invalid block time");
    }

    let result: BaseEvent[] = [];
    // parallel fetch transfers data for both tokens
    const transferPromises = tokenMintAddresses.map((tokenMintAddress) =>
      this.fetchTokenTransfers(tokenMintAddress, blockStartTime, blockEndTime)
    );
    const tokenTransfers = await Promise.all(transferPromises);
    for (let i = 0; i < tokenMintAddresses.length; i++) {
      const transfers = tokenTransfers[i];
      const tokenMintAddress = tokenMintAddresses[i];
      const transferGroups = new Map<string, TokenTransfer[]>();
      for (const transfer of transfers) {
        if (!transferGroups.has(transfer.trans_id)) {
          transferGroups.set(transfer.trans_id, []);
        }
        transferGroups.get(transfer.trans_id)!.push(transfer);
      }

      const events = new Array<BaseEvent>();
      for (const [transId, transferGroup] of transferGroups) {
        const baseEvent = new BaseEvent(this.chainId,
          transferGroup[0].block_id,
          transId,
          transferGroup[0].block_time,
          "success",
          tokenMintAddress
        );
        const froms = new Map<string, { address: string; amount: bigint }>();
        const tos = new Map<string, { address: string; amount: bigint }>();
        for (const transfer of transferGroup) {
          const fromAddress = transfer.from_address;
          const toAddress = transfer.to_address;
          const amount = BigInt(transfer.amount);
          const from = froms.get(fromAddress) ?? {
            address: fromAddress,
            amount: BigInt(0),
          };
          const to = tos.get(toAddress) ?? {
            address: toAddress,
            amount: BigInt(0),
          };
          from.amount += amount;
          to.amount += amount;
          froms.set(fromAddress, from);
          tos.set(toAddress, to);
        }
        events.push(new PermissionlessSPLTransferEvent(baseEvent, Array.from(froms.values()), Array.from(tos.values())));
      }
      console.log(
        `Fetched ${
          events.length
        } transfer transactions for ${tokenMintAddress}, event txhashes: ${events
          .map((e) => e.transactionHash)
          .join(", ")}`
      );
      result = mergeSortedArrays(result, events);
    }
    console.log(`Fetch ${result.length} transfer transactions`);

    return result;
  }

  private async fetchTokenTransfers(
    tokenAddress: string,
    blockStartTime: number,
    blockEndTime: number
  ): Promise<TokenTransfer[]> {
    const transfers: TokenTransfer[] = [];
    const batchSize = this.config.batchSize; // Increase batch size to improve efficiency
    let pageIndex = 0;
    let hasMoreData = true;

    while (hasMoreData) {
      // Create requests for the current batch of pages
      const pagePromises = [];
      for (let i = 0; i < batchSize; i++) {
        pageIndex++;
        pagePromises.push(
          this.fetchPage(tokenAddress, blockStartTime, blockEndTime, pageIndex)
        );
      }

      // parallel fetch all pages in the current batch
      const pagesData = await Promise.all(pagePromises);

      // Process the returned data
      for (const pageData of pagesData) {
        if (pageData.length > 0) {
          transfers.push(...pageData);
        }
        if (pageData.length < PAGE_SIZE) {
          hasMoreData = false; // No more data to fetch
        }
      }
    }

    return transfers;
  }

  private async fetchPage(
    tokenAddress: string,
    blockStartTime: number,
    blockEndTime: number,
    page: number,
    maxRetries = this.config.maxRetries
  ): Promise<TokenTransfer[]> {
    let retries = 0;

    const requestString = `${this.config.endpoint}?address=${tokenAddress}&activity_type[]=ACTIVITY_SPL_TRANSFER&block_time[]=${blockStartTime}&block_time[]=${blockEndTime}&exclude_amount_zero=true&page=${page}&page_size=100&sort_by=block_time&sort_order=asc`;
    while (retries < maxRetries) {
      try {
        const response = await axios.get(requestString, {
          headers: {
            "Content-Type": "application/json",
            token: this.apiKey as string,
          },
          timeout: this.config.timeout,
        });

        if (response.status !== 200) {
          throw new Error(
            `Transfer fetcher HTTP error! Status: ${response.status}`
          );
        }

        return (response.data.data || []) as TokenTransfer[];
      } catch (error) {
        console.log(`Solscan transfer fetching ${requestString} failed`, error);
        retries++;
        if (retries >= maxRetries) {
          throw new Error(
            `Solscan transfer fetching ${requestString} failed! Retries: ${maxRetries}`
          );
        }

        // Exponential backoff to avoid frequent retries
        const delay = Math.pow(2, retries) * 1000;
        console.log(
          `[Warning] Retry ${retries}/${maxRetries} for page ${page} after ${delay}ms`
        );
        await sleep(delay);
      }
    }

    return []; // Return empty array when all retries fail
  }
}

export interface FetchTokenTransfersParams {
  address: string; // Token address
  from: string; // From addresses (comma separated)
  to?: string; // To address (optional)
  blockTime: number[]; // [startTime, endTime]
  page: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}

export class SolscanService {
  public static readonly PAGE_SIZE = PAGE_SIZE;

  private apiKey: string;
  private endpoint: string;

  constructor(apiKey: string, endpoint: string) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async fetchTokenTransfers(
    params: FetchTokenTransfersParams
  ): Promise<TokenTransferResponse> {
    if (!this.endpoint || !this.apiKey) {
      throw new Error("Solscan API not initialized.");
    }

    const {
      address,
      from,
      to,
      blockTime: block_time,
      page,
      pageSize: page_size = SolscanService.PAGE_SIZE,
      sortBy: sort_by = "block_time",
      sortOrder: sort_order = "desc",
    } = params;

    // Build query string
    let queryString = `${this.endpoint}?address=${address}`;
    queryString += `&from=${encodeURIComponent(from)}`;

    if (to) {
      queryString += `&to=${encodeURIComponent(to)}`;
    }

    // Add block_time range
    queryString += `&block_time[]=${block_time[0]}&block_time[]=${block_time[1]}`;

    // Add pagination
    queryString += `&page=${page}&page_size=${page_size}`;

    // Add sorting
    queryString += `&sort_by=${sort_by}&sort_order=${sort_order}`;

    console.log(
      `Fetching token transfers: page ${page}, time range [${block_time[0]}, ${block_time[1]}]`
    );

    const response = await axios.get(queryString, {
      headers: {
        "Content-Type": "application/json",
        token: this.apiKey,
      },
    });

    if (response.status !== 200) {
      throw new Error(`Solscan API error: Status ${response.status}`);
    }

    const result = response.data as TokenTransferResponse;
    if (!result.success) {
      throw new Error("Solscan API returned unsuccessful response");
    }

    console.log(
      `Fetched ${result.data?.length ?? 0} transfers for page ${page}`
    );

    return result;
  }
}