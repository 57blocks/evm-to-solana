import { EventFetcher, FetchingResult } from "../chain";
import { Connection, PublicKey } from "@solana/web3.js";
import { sleep, mergeSortedArrays } from "../../common";
import { BaseEvent, TransactionEventsParser } from "../event";
import { SolscanTransferEventFetcher } from "./solscan";

export type SolanaEventFetcherConfig = {
  slotToExclusion: number;
  batchHours: number;
  batchDays: number;
  signaturesPerBatch: number;
  maxFetchedTransactionCount: number;
  sleepTime: number;
  slotToCheck: number;
  promiseNumberForTransactions: number;
};

export class SolanaEventFetcher implements EventFetcher {
  private chainId: number;
  private solanaEventsService: SolanaService;
  private defaultStartBlock: number;
  private maxCount: number;
  private transferEventFetcher: SolscanTransferEventFetcher;
  private config: SolanaEventFetcherConfig;

  constructor(
    chainId: number,
    solanaEventsService: SolanaService,
    defaultStartBlock: number,
    maxCount: number,
    config: SolanaEventFetcherConfig,
    transferEventFetcher: SolscanTransferEventFetcher
  ) {
    this.chainId = chainId;
    this.solanaEventsService = solanaEventsService;
    this.defaultStartBlock = defaultStartBlock;
    this.maxCount = maxCount;
    this.config = config;
    this.transferEventFetcher = transferEventFetcher;
  }

  async fetchEvents(
    monitorAddresses: string[],
    startBlock: number,
    eventsParser: TransactionEventsParser,
    endBlock: number = 0
  ): Promise<FetchingResult> {``
    if (startBlock == 0) {
      startBlock = this.defaultStartBlock - 1;
    }

    let parsedEvents: BaseEvent[] = [];
    const connection = this.solanaEventsService.getConnection(this.chainId);

    const currentSlot = await connection.getSlot();
    let endSlot = currentSlot - this.config.slotToExclusion;
    if (endBlock > 0) {
      endSlot = Math.min(endSlot, endBlock);
    }

    let startSlotOfBatch = startBlock + 1;
    let endBlockInfo;
    let signatureBatchSize;
    if (this.config.batchHours > 0) {
      signatureBatchSize = 9000 * this.config.batchHours; // 9000 is slots per hour
    } else {
      signatureBatchSize = 216000 * this.config.batchDays; // 216000 is slots per day
    }
    console.log(
      `Fetching transactions from slot ${startSlotOfBatch} to slot ${endSlot}`
    );
    const maxFetchedTransactionCount = this.config.maxFetchedTransactionCount;
    let fetchedTransactionCount = 0;
    let endSlotOfFetchedTransaction = 0;
    while (startSlotOfBatch < endSlot) {
      console.log(`Start to fetch signatures from ${startSlotOfBatch}`);
      const startBlock = await this.getStartTransactionSignature(
        connection,
        startSlotOfBatch
      );
      console.log(`Start block ${startBlock.startBlockSlot}`);

      const endSlotOfBatch = Math.min(
        startSlotOfBatch + signatureBatchSize,
        endSlot
      );
      endBlockInfo = await this.getLastTransactionSignature(
        connection,
        endSlotOfBatch
      );
      console.log(`End block ${endBlockInfo.endBlockSlot}`);

      let parsedEventsForBatch: BaseEvent[] = [];
      for (let i = 0; i < monitorAddresses.length; i++) {
        const monitorAddress = monitorAddresses[i];
        const sigList: string[] = [];
        const parsedEventsForAddress: BaseEvent[] = [];
        let beforeSignagure = endBlockInfo.endSignature;
        let sigsCount = this.config.signaturesPerBatch;
        while (sigsCount >= this.config.signaturesPerBatch) {
          console.log(
            `Start to fetch signatures from ${startBlock.startSignature} to ${beforeSignagure}, address ${monitorAddress}`
          );
          const sigs = await connection.getSignaturesForAddress(
            new PublicKey(monitorAddress),
            {
              limit: this.config.signaturesPerBatch,
              until: startBlock.startSignature,
              before: beforeSignagure,
            }
          );
          sigsCount = sigs.length;
          if (sigsCount > 0) {
            console.log(
              `Fetched ${sigsCount} signatures, address ${monitorAddress}`
            );
            beforeSignagure = sigs[sigsCount - 1].signature;
            sigList.unshift(...sigs.reverse().map((sig: any) => sig.signature));
            await sleep(this.config.sleepTime);
          }
        }
        console.log(
          `Fetched total ${sigList.length} signatures, address ${monitorAddress}`
        );
        for (
          let i = 0;
          i < sigList.length;
          i += this.config.promiseNumberForTransactions
        ) {
          const promises = [];
          const sigListForBatch = sigList.slice(
            i,
            i + this.config.promiseNumberForTransactions < sigList.length
              ? i + this.config.promiseNumberForTransactions
              : sigList.length
          );
          for (const sig of sigListForBatch) {
            promises.push(
              this.solanaEventsService.parseTransactionEvents(
                this.chainId,
                sig,
                eventsParser
              )
            );
          }
          const eventsList = await Promise.all(promises);
          for (const events of eventsList) {
            if (events.length > 0) {
              for (const event of events) {
                if (!event.monitorAddress) {
                  event.monitorAddress = monitorAddress;
                }
                parsedEventsForAddress.push(event);
              }
            }
          }
          await sleep(this.config.sleepTime);
        }
        parsedEventsForBatch = mergeSortedArrays(
          parsedEventsForBatch,
          parsedEventsForAddress
        );
        fetchedTransactionCount += sigList.length;
      }
      parsedEvents.push(...parsedEventsForBatch);
      console.log(`Total fetched transaction count ${fetchedTransactionCount}`);
      if (fetchedTransactionCount >= maxFetchedTransactionCount) {
        console.log(
          `Total fetched transaction count ${fetchedTransactionCount} reaches max limit ${maxFetchedTransactionCount}`
        );
        endSlotOfFetchedTransaction = endBlockInfo.endBlockSlot;
        break;
      }
      console.log(
        `Fetched ${parsedEvents.length} events ` +
          `from slot from slot ${startBlock.startBlockSlot} to slot ${endBlockInfo.endBlockSlot}, this.maxCount ${this.maxCount}`
      );
      if (parsedEvents.length >= this.maxCount) {
        console.log(
          `Total found event count ${parsedEvents.length} reaches max limit ${this.maxCount}`
        );
        break;
      }
      startSlotOfBatch = endBlockInfo.endBlockSlot + 1;
    }

    let endBlockSlot = endSlot;
    if (fetchedTransactionCount >= maxFetchedTransactionCount) {
      endBlockSlot = endSlotOfFetchedTransaction - 1;
    }
    if (parsedEvents.length >= this.maxCount) {
      endBlockSlot = parsedEvents[parsedEvents.length - 1].blockNumber - 1;
    }

    if (this.transferEventFetcher) {
      const transferEvents = await this.transferEventFetcher.fetchEvents(
        monitorAddresses,
        startBlock,
        endBlockSlot
      );
      parsedEvents = mergeSortedArrays(parsedEvents, transferEvents);
    }

    const result = new FetchingResult(parsedEvents, endBlockSlot);
    console.log(
      `Total events ${result.events.length}, synced block ${
        result.endBlockNumber
      }, event txhashes: ${result.events
        .map((e) => e.transactionHash)
        .join(", ")}`
    );

    return result;
  }

  // Find the first transaction signature in [lastSyncedSlot, lastSyncedSlot + CONFIG.backfill.solana.slotToCheck]
  private async getStartTransactionSignature(
    connection: Connection,
    lastSyncedSlot: number
  ) {
      // console.log(
      //   `Start to find start block from slot ${lastSyncedSlot} to slot ${lastSyncedSlot + CONFIG.backfill.solana.slotToCheck}`
      // );
      // 列出lastSyncedSlot到lastSyncedSlot + this.config.slotToCheck已确认的blocks
      const blockHistories = await connection.getBlocks(
        lastSyncedSlot,
        lastSyncedSlot + this.config.slotToCheck
      ); 
      // console.log(
      //   `Finish to find start block from slot ${lastSyncedSlot} to slot ${lastSyncedSlot + CONFIG.backfill.solana.slotToCheck}`
      // );
      // 遍历每个block，找到第一个transaction signature
      for (let i = 0; i < blockHistories.length; i++) {
        // console.log(`Start to find start block ${blockHistories[i]}`);
        // getBlock is a heavy function, it costs around 5s
        // 返回block的信息
        const startBlock = await connection.getBlock(blockHistories[i], {
          maxSupportedTransactionVersion: 0,
          rewards: false,
          transactionDetails: "accounts", // 'signatures' is the proper value, but it failed with this value (web3.js bug)
        });
        if (!startBlock) {
          throw new Error(`failed to fetch block found for slot ${blockHistories[i]}`);
        }
        // console.log(`Finish to find start block ${blockHistories[i]}`);
        const transactions = startBlock.transactions;
        if (transactions.length > 0) {
          // console.log(`find start block ${startBlock.blockhash}`);
          return {
            startBlockSlot: blockHistories[i],
            startSignature: transactions[0].transaction.signatures[0],
          };
        }
      }
      throw new Error(
        `No valid transactions found between slot ${lastSyncedSlot} and slot ${
          lastSyncedSlot + this.config.slotToCheck
        }`
      );
    
  }

  // Find the last transaction signature in [endSlot-CONFIG.backfill.solana.slotToCheck, endSlot]
  private async getLastTransactionSignature(
    connection: Connection,
    endSlot: number
  ) {
    const blockHistories = await connection.getBlocks(
      endSlot - this.config.slotToCheck,
      endSlot
    );
    for (let i = blockHistories.length - 1; i >= 0; i--) {
      // getBlock is a heavy function, it costs around 5s
      const endBlock = await connection.getBlock(blockHistories[i], {
        maxSupportedTransactionVersion: 0,
        rewards: false,
        transactionDetails: "accounts", // 'signatures' is the proper value, but it failed with this value (web3.js bug)
      });
      if (!endBlock) {
        throw new Error(`failed to fetch block found for slot ${blockHistories[i]}`);
      }
      const transactions = endBlock.transactions;
      if (transactions.length > 0) {
        // console.log(`find end block ${blockHistories[i]}`);
        return {
          endBlockSlot: blockHistories[i],
          endSignature:
            transactions[transactions.length - 1].transaction.signatures[0],
        };
      }
    }
    throw new Error(
      `No valid transactions found between slot ${
        endSlot - this.config.slotToCheck
      } and slot ${endSlot}`
    );
  }
}

import { SolanaConnections } from "../../../infrastructure";

/**
 * SolanaService (event-fetch 模块专用)
 * 扩展基础设施层的 SolanaService，添加事件解析功能
 * 所有模块应使用 infrastructure/SolanaService 作为基础服务
 * 此类的 parseTransactionEvents 方法用于 event-fetch 模块内部
 */
export class SolanaService {
  private solanaConnections: SolanaConnections;

  constructor(solanaConnections: SolanaConnections) {
    this.solanaConnections = solanaConnections;
  }

  getConnection(chainId: number): Connection {
    return this.solanaConnections.getConnection(chainId);
  }

  // We have to do this because graphql mutation can't accept pool/juniorTranche/seniorTranche currently
  async parseTransactionEvents(
    chainId: number,
    sig: string,
    eventsParser: TransactionEventsParser
  ): Promise<BaseEvent[]> {
    const events = new Array<BaseEvent>();
    const connection = this.solanaConnections.getConnection(chainId);

    // TODO maxSupportedTransactionVersion: 0 is correct?
    const ptx = await connection.getParsedTransaction(sig, {
      maxSupportedTransactionVersion: 0,
    });

    if (!ptx) {
      console.log(
        `[Error] Can not get the parsed transaction from solana rpc, txhash: ${sig}`
      );
      return events;
    }

    if (ptx.meta?.err) {
      console.log(`Transaction ${sig} is failed`);
      return events;
    }

    return eventsParser.parseEvents({ tx: ptx, sig: sig });
  }
}
