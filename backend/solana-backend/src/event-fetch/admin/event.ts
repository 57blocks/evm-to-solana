/* eslint-disable @typescript-eslint/no-explicit-any */
import { ParsedTransactionWithMeta, PublicKey } from "@solana/web3.js";
import { BorshCoder, EventParser, Idl } from "@coral-xyz/anchor";
import {
  BaseEvent,
  TransactionEventsParser,
  TransactionEventsParserFactory,
  EventClass,
} from "../chain/event";
import StakingIDL from "../../solana_staking.json";

const SOLANA_ANCHOR_EVENT = "solana.anchor.event";

/**
 * Admin events — emitted by admin-only instructions
 * (create_pool, fund_rewards, withdraw_remaining_rewards, close_pool,
 *  add_to_blacklist, remove_from_blacklist, close_user_stake_account[admin path])
 *
 * Currently implemented: PoolCreated, RewardsFunded.
 * Add new admin events here as the contract surface grows.
 */
export enum AdminEventName {
  PoolCreated = "PoolCreated",
  RewardsFunded = "RewardsFunded",
}

export class AdminPoolCreatedEvent extends BaseEvent {
  static eventName(): string {
    return AdminEventName.PoolCreated;
  }

  static eventType(): string {
    return SOLANA_ANCHOR_EVENT;
  }

  pool: string;
  authority: string;
  stakingMint: string;
  rewardMint: string;
  rewardPerSecond: bigint;
  createdAt: number;

  constructor(
    baseEvent: BaseEvent,
    pool: string,
    authority: string,
    stakingMint: string,
    rewardMint: string,
    rewardPerSecond: bigint,
    createdAt: number
  ) {
    super(
      baseEvent.chainId,
      baseEvent.blockNumber,
      baseEvent.transactionHash,
      baseEvent.timestamp,
      baseEvent.status,
      baseEvent.monitorAddress
    );
    this.pool = pool;
    this.authority = authority;
    this.stakingMint = stakingMint;
    this.rewardMint = rewardMint;
    this.rewardPerSecond = rewardPerSecond;
    this.createdAt = createdAt;
  }

  getActionData() {
    return {
      pool: this.pool,
      authority: this.authority,
      stakingMint: this.stakingMint,
      rewardMint: this.rewardMint,
      rewardPerSecond: this.rewardPerSecond,
      createdAt: this.createdAt,
    };
  }
}

export class AdminRewardsFundedEvent extends BaseEvent {
  static eventName(): string {
    return AdminEventName.RewardsFunded;
  }

  static eventType(): string {
    return SOLANA_ANCHOR_EVENT;
  }

  pool: string;
  funder: string;
  amount: bigint;
  fundedAt: number;

  constructor(
    baseEvent: BaseEvent,
    pool: string,
    funder: string,
    amount: bigint,
    fundedAt: number
  ) {
    super(
      baseEvent.chainId,
      baseEvent.blockNumber,
      baseEvent.transactionHash,
      baseEvent.timestamp,
      baseEvent.status,
      baseEvent.monitorAddress
    );
    this.pool = pool;
    this.funder = funder;
    this.amount = amount;
    this.fundedAt = fundedAt;
  }

  getActionData() {
    return {
      pool: this.pool,
      funder: this.funder,
      amount: this.amount,
      fundedAt: this.fundedAt,
    };
  }
}

export class AdminTransactionEventsParser implements TransactionEventsParser {
  private chainId: number;

  constructor(chainId: number) {
    this.chainId = chainId;
  }

  addEventClass(_eventClass: EventClass) {
    // Admin parser fully driven by IDL event names; no per-class subscription needed.
  }

  parseEvents(data: any): BaseEvent[] {
    const events = new Array<BaseEvent>();
    const ptx = data.tx as ParsedTransactionWithMeta;
    const programId = new PublicKey(StakingIDL.address);
    const coder = new BorshCoder(StakingIDL as Idl);
    const ep = new EventParser(programId, coder);

    let logs;
    try {
      logs = ep.parseLogs(ptx.meta?.logMessages ?? []);
    } catch (error) {
      console.log(
        `[Error] AdminTransactionEventsParser parseLogs failed, tx: ${data.sig}, error: ${error}`
      );
      return events;
    }

    let next;
    try {
      next = logs.next();
    } catch (error) {
      console.log(
        `[Error] AdminTransactionEventsParser iteration failed, tx: ${data.sig}, error: ${error}`
      );
      return events;
    }
    while (!next.done) {
      const eventValue = next.value;
      if (eventValue) {
        const baseEvent = new BaseEvent(
          this.chainId,
          ptx.slot,
          data.sig,
          ptx.blockTime ?? 0,
          ptx.meta?.err ? "failed" : "success"
        );
        const event = this.parseEvent(baseEvent, eventValue);
        if (event) {
          events.push(event);
        }
      }

      try {
        next = logs.next();
      } catch (error) {
        console.log(
          `[Error] AdminTransactionEventsParser iteration failed mid-stream, tx: ${data.sig}, error: ${error}`
        );
        break;
      }
    }

    return events;
  }

  private parseEvent(baseEvent: BaseEvent, data: any): BaseEvent | null {
    const eventData = data;
    const payload = eventData.data;

    if (AdminPoolCreatedEvent.eventName() === eventData.name) {
      return new AdminPoolCreatedEvent(
        baseEvent,
        payload.pool.toString(),
        payload.authority.toString(),
        payload.staking_mint.toString(),
        payload.reward_mint.toString(),
        BigInt(payload.reward_per_second.toString()),
        parseInt(payload.timestamp.toString())
      );
    }
    if (AdminRewardsFundedEvent.eventName() === eventData.name) {
      return new AdminRewardsFundedEvent(
        baseEvent,
        payload.pool.toString(),
        payload.funder.toString(),
        BigInt(payload.amount.toString()),
        parseInt(payload.timestamp.toString())
      );
    }

    return null;
  }
}

export class AdminTransactionEventsParserFactory implements TransactionEventsParserFactory {
  createTransactionEventsParser(
    chainId: number,
    _sources: string[],
    eventClasses: EventClass[]
  ): TransactionEventsParser {
    const parser = new AdminTransactionEventsParser(chainId);
    eventClasses.forEach((eventClass) => parser.addEventClass(eventClass));
    return parser;
  }
}
