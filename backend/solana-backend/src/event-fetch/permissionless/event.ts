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
import StakingIDL from "../../solana_staking.json";

const SOLANA_ANCHOR_EVENT = "solana.anchor.event";
const SOLANA_SPL_EVENT = "solana.spl.event";

export enum PermissionlessEventName {
  Staked = "Staked",
  Unstaked = "Unstaked",
  RewardsClaimed = "RewardsClaimed",
  Transfer = "Transfer",
  TransferChecked = "TransferChecked"
}

export class PermissionlessStakedEvent extends BaseEvent {
  static eventName(): string {
    return PermissionlessEventName.Staked;
  }

  static eventType(): string {
    return SOLANA_ANCHOR_EVENT;
  }

  userAddress: string;
  amount: bigint;
  rewards: bigint;
  stakeAt: number;

  constructor(baseEvent: BaseEvent,
              userAddress: string,
              amount: bigint,
              rewards: bigint,
              stakeAt: number) {
    super(baseEvent.chainId, 
          baseEvent.blockNumber,
          baseEvent.transactionHash,
          baseEvent.timestamp,
          baseEvent.status,
          baseEvent.monitorAddress);
    this.userAddress = userAddress;
    this.amount = amount;
    this.rewards = rewards;
    this.stakeAt = stakeAt;
  }

  getActionData() {
    return {
      userAddress: this.userAddress,
      amount: this.amount,
      stakeAt: this.stakeAt,
    };
  }

  toString(): string {
    return `${this.constructor.name}(chainId=${this.chainId}, blockNumber=${this.blockNumber}, ` +
      `txHash=${this.transactionHash}, userAddress=${this.userAddress}, ` +
      `amount=${this.amount.toString()}, rewards=${this.rewards.toString()}, ` +
      `stakeAt=${this.stakeAt}, timestamp=${this.timestamp}, status=${this.status})`;
  }
}

export class PermissionlessUnstakedEvent extends BaseEvent {
  static eventName(): string {
    return PermissionlessEventName.Unstaked;
  }

  static eventType(): string {
    return SOLANA_ANCHOR_EVENT;
  }

  userAddress: string;
  amount: bigint;
  rewards: bigint;
  unstakeAt: number;

  constructor(baseEvent: BaseEvent,
              userAddress: string,
              amount: bigint,
              rewards: bigint,
              unstakeAt: number) {
    super(baseEvent.chainId, 
          baseEvent.blockNumber,
          baseEvent.transactionHash,
          baseEvent.timestamp,
          baseEvent.status,
          baseEvent.monitorAddress);
    this.userAddress = userAddress;
    this.amount = amount;
    this.rewards = rewards;
    this.unstakeAt = unstakeAt;
  }

  getActionData() {
    return {
      userAddress: this.userAddress,
      amount: this.amount,
      rewards: this.rewards,
      unstakeAt: this.unstakeAt,
    };
  }

  toString(): string {
    return `${this.constructor.name}(chainId=${this.chainId}, blockNumber=${this.blockNumber}, ` +
      `txHash=${this.transactionHash}, userAddress=${this.userAddress}, ` +
      `amount=${this.amount.toString()}, rewards=${this.rewards.toString()}, ` +
      `unstakeAt=${this.unstakeAt}, timestamp=${this.timestamp}, status=${this.status})`;
  }
}

export class PermissionlessRewardsClaimedEvent extends BaseEvent {
  static eventName(): string {
    return PermissionlessEventName.RewardsClaimed;
  }

  static eventType(): string {
    return SOLANA_ANCHOR_EVENT;
  }

  userAddress: string;
  amount: bigint;
  claimAt: number;

  constructor(baseEvent: BaseEvent,
              userAddress: string,
              amount: bigint,
              claimAt: number) {
    super(baseEvent.chainId, 
          baseEvent.blockNumber,
          baseEvent.transactionHash,
          baseEvent.timestamp,
          baseEvent.status,
          baseEvent.monitorAddress);
    this.userAddress = userAddress;
    this.amount = amount;
    this.claimAt = claimAt;
  }

  getActionData() {
    return {
      userAddress: this.userAddress,
      amount: this.amount,
      claimAt: this.claimAt,
    };
  }

  toString(): string {
    return `${this.constructor.name}(chainId=${this.chainId}, blockNumber=${this.blockNumber}, ` +
      `txHash=${this.transactionHash}, userAddress=${this.userAddress}, ` +
      `amount=${this.amount.toString()}, claimAt=${this.claimAt}, ` +
      `timestamp=${this.timestamp}, status=${this.status})`;
  }
}



export class PermissionlessSPLTransferEvent extends BaseEvent {

  static eventType(): string {
    return SOLANA_SPL_EVENT;
  }

  froms: {
    address: string;
    amount: bigint;
  }[];
  tos: {
    address: string;
    amount: bigint;
  }[];

  constructor(baseEvent: BaseEvent,
              froms: { address: string; amount: bigint }[], 
              tos: { address: string; amount: bigint }[]) {
    super(baseEvent.chainId, 
          baseEvent.blockNumber,
          baseEvent.transactionHash,
          baseEvent.timestamp,
          baseEvent.status,
          baseEvent.monitorAddress);
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

export class PermissionlessTransactionEventsParser
  implements TransactionEventsParser
{
  private anchorEventParser: PermissionlessTransactionAnchorEventsParser;
  private splEventParser: PermissionlessSPLTransactionEventsParser;

  constructor(chainId: number, tokenMints: string[]) {
    this.anchorEventParser =
      new PermissionlessTransactionAnchorEventsParser(chainId);
    this.splEventParser = new PermissionlessSPLTransactionEventsParser(
      chainId,
      tokenMints
    );
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

  // data type is {tx: ParsedTransactionWithMeta, sig: string}
  // tx is solana web3 library's ParsedTransactionWithMeta type
  // sig is transaction hash
  parseEvents(data: any): BaseEvent[] {
    const events = this.anchorEventParser.parseEvents(data);
    const splEvents = this.splEventParser.parseEvents(data);
    return [...events, ...splEvents];
  }
}

class PermissionlessTransactionAnchorEventsParser
  implements TransactionEventsParser
{
  private chainId: number;
  private static readonly LOG_PREFIX = "Program log: Calculating rewards:";

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
    let rewards = 0n;
    for (const log of ptx.meta?.logMessages ?? []) {
      console.log(`[Debug] Log: ${log}`);
      if (log.startsWith(PermissionlessTransactionAnchorEventsParser.LOG_PREFIX)) {
        console.log(`[Debug] Log starts with Calculating rewards: ${log}`);
        // format: Calculating rewards: amount=150000000000, last_claim=1766652608, current_time=1766652610, rate=100, rewards=34722"
        const rewardsMatch = log.match(/rewards=(\d+)/);
        if (rewardsMatch && rewardsMatch[1]) {
          rewards = BigInt(rewardsMatch[1]);
          console.log(`[Debug] Extracted rewards: ${rewards}`);
          break;
        }
      }
    }
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
           ptx.meta?.err ? "failed" : "success");
        const event = this.parseEvent(baseEvent, eventValue, rewards);
        if (event) {
          events.push(event);
        }
      }

      next = logs.next();
    }

    return events;
  }

  // eventData type is the parsed event type from Anchor event parser's parseLogs function
  private parseEvent(baseEvent: BaseEvent, data: any, rewards: bigint): BaseEvent | null {
    let event = null;
    const eventData = data;
    if (PermissionlessStakedEvent.eventName() === eventData.name) {
      event = new PermissionlessStakedEvent(baseEvent, eventData.data.user.toString(),
       BigInt(eventData.data.amount.toString()),
       rewards,
       parseInt(eventData.data.timestamp.toString()));
    } else if (
      PermissionlessUnstakedEvent.eventName() === eventData.name
    ) {
      event = new PermissionlessUnstakedEvent(baseEvent, eventData.data.user.toString(),
       BigInt(eventData.data.amount.toString()),
       rewards,
        parseInt(eventData.data.timestamp.toString()));
    } else if (
      PermissionlessRewardsClaimedEvent.eventName() === eventData.name
    ) {
      event = new PermissionlessRewardsClaimedEvent(baseEvent, eventData.data.user.toString(),
       rewards,
        parseInt(eventData.data.timestamp.toString()));
    } 

    return event;
  }
}

class PermissionlessSPLTransactionEventsParser implements TransactionEventsParser {
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
      PermissionlessSPLTransactionEventsParser.LOG_PREFIX + eventClass.eventName()
    );
  }

  // data type is {tx: ParsedTransactionWithMeta, sig: string}
  // tx is solana web3 library's ParsedTransactionWithMeta type
  // sig is transaction hash
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
      const baseEvent = new BaseEvent(this.chainId, ptx.slot, data.sig, ptx.blockTime ?? 0,
        ptx.meta?.err ? "failed" : "success");

      if (PermissionlessSPLTransferEvent.eventName() === eventName) {
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
  ): PermissionlessSPLTransferEvent | null {
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
      event = new PermissionlessSPLTransferEvent(baseEvent, Array.from(fromsMap.values()), Array.from(tosMap.values()));
    }

    // console.log(
    //   `froms: ${JSON.stringify(froms, (_, v) => (typeof v === 'bigint' ? v.toString() : v))}`
    // );
    // console.log(
    //   `tos: ${JSON.stringify(tos, (_, v) => (typeof v === 'bigint' ? v.toString() : v))}`
    // );

    if (!event) {
      console.log(
        `[Warning] parse 0 Transfer event, txhash: ${baseEvent.transactionHash}`
      );
    }
    return event;
  }
}

export class PermissionlessTransactionEventsParserFactory
  implements TransactionEventsParserFactory
{
  createTransactionEventsParser(
    chainId: number,
    sources: string[],
    eventClasses: EventClass[]
  ): TransactionEventsParser {
    const parser = new PermissionlessTransactionEventsParser(
      chainId,
      sources
    );
    eventClasses.forEach((eventClass) =>
      parser.addEventClass(eventClass)
    );
    return parser;
  }
}
