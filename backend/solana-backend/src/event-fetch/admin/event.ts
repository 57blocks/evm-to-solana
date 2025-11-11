/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ParsedTransactionWithMeta,
  PublicKey
} from "@solana/web3.js";
import {
  BorshCoder,
  EventParser,
  Idl,
} from "@coral-xyz/anchor";
import {
  BaseEvent,
  TransactionEventsParser,
  TransactionEventsParserFactory,
} from "../chain/event";
import StakingIDL from "../solana_staking.json";

const SOLANA_ANCHOR_EVENT = "solana.anchor.event";

export enum AdminEventType {
  Initialized = "Initialized",
  AdminEvent = "AdminEvent"
}

export class AdminEvent extends BaseEvent {
  static eventName(): string {
    return AdminEventType.AdminEvent;
  }
}

export class InitializedEvent extends AdminEvent {
  static eventName(): string {
    return AdminEventType.Initialized;
  }

  static eventType(): string {
    return SOLANA_ANCHOR_EVENT;
  }

  authority: string;
  stakingMint: string;
  rewardMint: string;
  rewardRate: number;
  timestamp: number;

  constructor(baseEvent: BaseEvent,
              authority: string,
              stakingMint: string,
              rewardMint: string,
              rewardRate: number,
              timestamp: number) {
    super(baseEvent.chainId, 
          baseEvent.blockNumber,
          baseEvent.transactionHash,
          baseEvent.timestamp,
          baseEvent.status,
          baseEvent.monitorAddress);
    this.authority = authority;
    this.stakingMint = stakingMint;
    this.rewardMint = rewardMint;
    this.rewardRate = rewardRate;
    this.timestamp = timestamp;
  }

  getActionData() {
    return {
      authority: this.authority,
      stakingMint: this.stakingMint,
      rewardMint: this.rewardMint,
      rewardRate: this.rewardRate,
      timestamp: this.timestamp,
    };
  }
}

export class AdminTransactionEventsParser
  implements TransactionEventsParser
{
  private adminEventParser: AdminTransactionAnchorEventsParser;

  constructor(chainId: number) {
    this.adminEventParser =
      new AdminTransactionAnchorEventsParser(chainId);
  }

  // data type is {tx: ParsedTransactionWithMeta, sig: string}
  // tx is solana web3 library's ParsedTransactionWithMeta type
  // sig is transaction hash
  parseEvents(data: any): BaseEvent[] {
    return this.adminEventParser.parseEvents(data);
  }
}

class AdminTransactionAnchorEventsParser
  implements TransactionEventsParser
{
  private chainId: number;

  constructor(chainId: number) {
    this.chainId = chainId;
  }

  // data type is {tx: ParsedTransactionWithMeta, sig: string}
  // tx is solana web3 library's ParsedTransactionWithMeta type
  // sig is transaction hash
  parseEvents(data: any): BaseEvent[] {
    const events = new Array<BaseEvent>();
    const ptx = data.tx as ParsedTransactionWithMeta;
    const programId = new PublicKey(StakingIDL.address);
    const coder = new BorshCoder(StakingIDL as Idl);
    const ep = new EventParser(programId, coder);
    const logs = ep.parseLogs(ptx.meta?.logMessages ?? []);
    let next;
    try {
      next = logs.next();
    } catch (error) {
      console.log(
        `[Error] SolanaTransactionAnchorEventsParser parsing logs: ${ptx.meta?.logMessages ?? []} failed, tx: ${data.sig}, error: ${error}`
      );
      return events;
    }
    while (!next.done) {
      const eventValue = next.value;
      if (eventValue) {
        const baseEvent = new BaseEvent(this.chainId, ptx.slot, data.sig, ptx.blockTime ?? 0,
           ptx.meta?.err ? "failed" : "success", programId.toString());
        const event = this.parseEvent(baseEvent, eventValue);
        if (event) {
          events.push(event);
        }
      }

      next = logs.next();
    }

    return events;
  }

  // eventData type is the parsed event type from Anchor event parser's parseLogs function
  private parseEvent(baseEvent: BaseEvent, data: any): AdminEvent | null {
    let event = null;
    const eventData = data;
    if (InitializedEvent.eventName() === eventData.name) {
      console.log("InitializedEvent", eventData);
      event = new InitializedEvent(baseEvent, eventData.data.authority.toString(),
       eventData.data.staking_mint.toString(), eventData.data.reward_mint.toString(),
        parseInt(eventData.data.reward_rate.toString()), parseInt(eventData.data.timestamp.toString()));
    } 

    return event;
  }
}

export class AdminTransactionEventsParserFactory
  implements TransactionEventsParserFactory
{
  createTransactionEventsParser(
    chainId: number,
  ): TransactionEventsParser {
    return new AdminTransactionEventsParser(chainId);
  }
}
