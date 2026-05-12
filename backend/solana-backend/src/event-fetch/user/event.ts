/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ParsedTransactionWithMeta,
  PublicKey,
  TokenBalance,
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
  EventClass,
} from "../chain/event";
import StakingIDL from "../../../idl/solana_staking.json";

const SOLANA_ANCHOR_EVENT = "solana.anchor.event";
const SOLANA_SPL_EVENT = "solana.spl.event";

export enum UserEventName {
  Staked = "Staked",
  Unstaked = "Unstaked",
  RewardsClaimed = "RewardsClaimed",
  Transfer = "Transfer",
  TransferChecked = "TransferChecked",
}

export class UserStakedEvent extends BaseEvent {
  static eventName(): string {
    return UserEventName.Staked;
  }

  static eventType(): string {
    return SOLANA_ANCHOR_EVENT;
  }

  pool: string;
  userAddress: string;
  amount: bigint;
  stakeAt: number;

  constructor(
    baseEvent: BaseEvent,
    pool: string,
    userAddress: string,
    amount: bigint,
    stakeAt: number
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
    this.userAddress = userAddress;
    this.amount = amount;
    this.stakeAt = stakeAt;
  }

  getActionData() {
    return {
      pool: this.pool,
      userAddress: this.userAddress,
      amount: this.amount,
      stakeAt: this.stakeAt,
    };
  }

  toString(): string {
    return `${this.constructor.name}(chainId=${this.chainId}, blockNumber=${this.blockNumber}, ` +
      `txHash=${this.transactionHash}, pool=${this.pool}, userAddress=${this.userAddress}, ` +
      `amount=${this.amount.toString()}, stakeAt=${this.stakeAt}, timestamp=${this.timestamp}, status=${this.status})`;
  }
}

export class UserUnstakedEvent extends BaseEvent {
  static eventName(): string {
    return UserEventName.Unstaked;
  }

  static eventType(): string {
    return SOLANA_ANCHOR_EVENT;
  }

  pool: string;
  userAddress: string;
  amount: bigint;
  unstakeAt: number;

  constructor(
    baseEvent: BaseEvent,
    pool: string,
    userAddress: string,
    amount: bigint,
    unstakeAt: number
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
    this.userAddress = userAddress;
    this.amount = amount;
    this.unstakeAt = unstakeAt;
  }

  getActionData() {
    return {
      pool: this.pool,
      userAddress: this.userAddress,
      amount: this.amount,
      unstakeAt: this.unstakeAt,
    };
  }

  toString(): string {
    return `${this.constructor.name}(chainId=${this.chainId}, blockNumber=${this.blockNumber}, ` +
      `txHash=${this.transactionHash}, pool=${this.pool}, userAddress=${this.userAddress}, ` +
      `amount=${this.amount.toString()}, unstakeAt=${this.unstakeAt}, timestamp=${this.timestamp}, status=${this.status})`;
  }
}

export class UserRewardsClaimedEvent extends BaseEvent {
  static eventName(): string {
    return UserEventName.RewardsClaimed;
  }

  static eventType(): string {
    return SOLANA_ANCHOR_EVENT;
  }

  pool: string;
  userAddress: string;
  amount: bigint;
  claimAt: number;

  constructor(
    baseEvent: BaseEvent,
    pool: string,
    userAddress: string,
    amount: bigint,
    claimAt: number
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
    this.userAddress = userAddress;
    this.amount = amount;
    this.claimAt = claimAt;
  }

  getActionData() {
    return {
      pool: this.pool,
      userAddress: this.userAddress,
      amount: this.amount,
      claimAt: this.claimAt,
    };
  }

  toString(): string {
    return `${this.constructor.name}(chainId=${this.chainId}, blockNumber=${this.blockNumber}, ` +
      `txHash=${this.transactionHash}, pool=${this.pool}, userAddress=${this.userAddress}, ` +
      `amount=${this.amount.toString()}, claimAt=${this.claimAt}, timestamp=${this.timestamp}, status=${this.status})`;
  }
}

export class UserSPLTransferEvent extends BaseEvent {
  static eventType(): string {
    return SOLANA_SPL_EVENT;
  }

  froms: { address: string; amount: bigint }[];
  tos: { address: string; amount: bigint }[];

  constructor(
    baseEvent: BaseEvent,
    froms: { address: string; amount: bigint }[],
    tos: { address: string; amount: bigint }[]
  ) {
    super(
      baseEvent.chainId,
      baseEvent.blockNumber,
      baseEvent.transactionHash,
      baseEvent.timestamp,
      baseEvent.status,
      baseEvent.monitorAddress
    );
    this.froms = froms;
    this.tos = tos;
  }

  getActionData() {
    return {
      froms: this.froms,
      tos: this.tos,
    };
  }

  toString(): string {
    const fromsStr = this.froms.map(f => `${f.address}:${f.amount.toString()}`).join(", ");
    const tosStr = this.tos.map(t => `${t.address}:${t.amount.toString()}`).join(", ");
    return `${this.constructor.name}(chainId=${this.chainId}, blockNumber=${this.blockNumber}, ` +
      `txHash=${this.transactionHash}, monitorAddress=${this.monitorAddress || "N/A"}, ` +
      `froms=[${fromsStr}], tos=[${tosStr}], timestamp=${this.timestamp}, status=${this.status})`;
  }
}

export class UserTransactionEventsParser implements TransactionEventsParser {
  private anchorEventParser: UserTransactionAnchorEventsParser;
  private splEventParser: UserSPLTransactionEventsParser;

  constructor(chainId: number, tokenMints: string[], programId: string) {
    this.anchorEventParser = new UserTransactionAnchorEventsParser(chainId, programId);
    this.splEventParser = new UserSPLTransactionEventsParser(chainId, tokenMints);
  }

  addEventClass(eventClass: EventClass) {
    switch (eventClass.eventType()) {
      case SOLANA_SPL_EVENT:
        this.splEventParser.addEventClass(eventClass);
        break;
      default:
        break;
    }
  }

  parseEvents(data: any): BaseEvent[] {
    const events = this.anchorEventParser.parseEvents(data);
    const splEvents = this.splEventParser.parseEvents(data);
    return [...events, ...splEvents];
  }
}

class UserTransactionAnchorEventsParser implements TransactionEventsParser {
  private chainId: number;
  private programId: PublicKey;

  constructor(chainId: number, programId: string) {
    this.chainId = chainId;
    this.programId = new PublicKey(programId);
  }

  parseEvents(data: any): BaseEvent[] {
    const events = new Array<BaseEvent>();
    const ptx = data.tx as ParsedTransactionWithMeta;
    const coder = new BorshCoder(StakingIDL as Idl);
    const ep = new EventParser(this.programId, coder);

    let logs;
    try {
      logs = ep.parseLogs(ptx.meta?.logMessages ?? []);
    } catch (error) {
      console.error(
        `[Error] UserTransactionAnchorEventsParser parseLogs failed, tx: ${data.sig}, error: ${error}`
      );
      return events;
    }

    let next;
    try {
      next = logs.next();
    } catch (error) {
      console.error(
        `[Error] UserTransactionAnchorEventsParser iteration failed, tx: ${data.sig}, error: ${error}`
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
        console.error(
          `[Error] UserTransactionAnchorEventsParser iteration failed mid-stream, tx: ${data.sig}, error: ${error}`
        );
        break;
      }
    }

    return events;
  }

  private parseEvent(baseEvent: BaseEvent, data: any): BaseEvent | null {
    const eventData = data;
    const payload = eventData.data;

    if (UserStakedEvent.eventName() === eventData.name) {
      return new UserStakedEvent(
        baseEvent,
        payload.pool.toString(),
        payload.user.toString(),
        BigInt(payload.amount.toString()),
        parseInt(payload.timestamp.toString())
      );
    }
    if (UserUnstakedEvent.eventName() === eventData.name) {
      return new UserUnstakedEvent(
        baseEvent,
        payload.pool.toString(),
        payload.user.toString(),
        BigInt(payload.amount.toString()),
        parseInt(payload.timestamp.toString())
      );
    }
    if (UserRewardsClaimedEvent.eventName() === eventData.name) {
      return new UserRewardsClaimedEvent(
        baseEvent,
        payload.pool.toString(),
        payload.user.toString(),
        BigInt(payload.amount.toString()),
        parseInt(payload.timestamp.toString())
      );
    }

    return null;
  }
}

class UserSPLTransactionEventsParser implements TransactionEventsParser {
  private static readonly LOG_PREFIX = `Program log: Instruction: `;

  private chainId: number;
  private monitorLogs: Set<string> = new Set();
  private tokenMints: string[] = [];

  constructor(chainId: number, tokenMints: string[]) {
    this.chainId = chainId;
    this.tokenMints = tokenMints;
  }

  addEventClass(eventClass: EventClass) {
    this.monitorLogs.add(
      UserSPLTransactionEventsParser.LOG_PREFIX + eventClass.eventName()
    );
  }

  parseEvents(data: any): BaseEvent[] {
    const ptx = data.tx as ParsedTransactionWithMeta;
    const events = new Array<BaseEvent>();
    let eventName;
    for (const log of ptx.meta?.logMessages ?? []) {
      if (this.monitorLogs.has(log)) {
        eventName = log.split(":")[2].trim();
        break;
      }
    }

    if (eventName) {
      const baseEvent = new BaseEvent(
        this.chainId,
        ptx.slot,
        data.sig,
        ptx.blockTime ?? 0,
        ptx.meta?.err ? "failed" : "success"
      );

      if (UserSPLTransferEvent.eventName() === eventName) {
        for (const tokenMint of this.tokenMints) {
          const event = this.parseSPLTransferEvent(baseEvent, ptx, tokenMint);
          if (event) {
            event.monitorAddress = tokenMint;
            events.push(event);
          }
        }
      }
    }

    return events;
  }

  private parseSPLTransferEvent(
    baseEvent: BaseEvent,
    tx: ParsedTransactionWithMeta,
    tokenMint: string
  ): UserSPLTransferEvent | null {
    let event = null;
    const accountIndexes = new Set<number>();
    const preTokenBalanceMap = new Map<number, TokenBalance>();
    tx.meta?.preTokenBalances?.forEach((tokenbalance) => {
      if (tokenbalance?.mint === tokenMint) {
        accountIndexes.add(tokenbalance.accountIndex);
        preTokenBalanceMap.set(tokenbalance.accountIndex, tokenbalance);
      }
    });
    const postTokenBalanceMap = new Map<number, TokenBalance>();
    tx.meta?.postTokenBalances?.forEach((tokenbalance) => {
      if (tokenbalance.mint === tokenMint) {
        accountIndexes.add(tokenbalance.accountIndex);
        postTokenBalanceMap.set(tokenbalance.accountIndex, tokenbalance);
      }
    });
    const froms = new Array<{ address: string; amount: bigint }>();
    const tos = new Array<{ address: string; amount: bigint }>();
    for (const accountIndex of accountIndexes) {
      const preTokenBalance = preTokenBalanceMap.get(accountIndex);
      const postTokenBalance = postTokenBalanceMap.get(accountIndex);
      if (preTokenBalance && postTokenBalance) {
        const preAmount = BigInt(preTokenBalance.uiTokenAmount.amount);
        const postAmount = BigInt(postTokenBalance.uiTokenAmount.amount);
        if (preAmount > postAmount) {
          froms.push({
            address: preTokenBalance.owner!,
            amount: preAmount - postAmount,
          });
        } else if (preAmount < postAmount) {
          tos.push({
            address: postTokenBalance.owner!,
            amount: postAmount - preAmount,
          });
        }
      } else if (preTokenBalance && !postTokenBalance) {
        const preAmount = BigInt(preTokenBalance.uiTokenAmount.amount);
        if (preAmount > 0n) {
          froms.push({
            address: preTokenBalance.owner!,
            amount: preAmount,
          });
        }
      } else if (!preTokenBalance && postTokenBalance) {
        const postAmount = BigInt(postTokenBalance.uiTokenAmount.amount);
        if (postAmount > 0n) {
          tos.push({
            address: postTokenBalance.owner!,
            amount: postAmount,
          });
        }
      }
    }

    if (froms.length > 0 && tos.length > 0) {
      const fromsMap = new Map<string, { address: string; amount: bigint }>();
      froms.forEach((from) => {
        const obj = fromsMap.get(from.address) ?? {
          address: from.address,
          amount: 0n,
        };
        obj.amount += from.amount;
        fromsMap.set(obj.address, obj);
      });
      const tosMap = new Map<string, { address: string; amount: bigint }>();
      tos.forEach((to) => {
        const obj = tosMap.get(to.address) ?? {
          address: to.address,
          amount: 0n,
        };
        obj.amount += to.amount;
        tosMap.set(obj.address, obj);
      });
      event = new UserSPLTransferEvent(baseEvent, Array.from(fromsMap.values()), Array.from(tosMap.values()));
    }

    if (!event) {
      console.warn(
        `[Warning] parse 0 Transfer event, txhash: ${baseEvent.transactionHash}`
      );
    }
    return event;
  }
}

export class UserTransactionEventsParserFactory implements TransactionEventsParserFactory {
  createTransactionEventsParser(
    chainId: number,
    sources: string[],
    eventClasses: EventClass[],
    programId: string
  ): TransactionEventsParser {
    const parser = new UserTransactionEventsParser(chainId, sources, programId);
    eventClasses.forEach((eventClass) => parser.addEventClass(eventClass));
    return parser;
  }
}