/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AccountMeta,
  ParsedTransactionWithMeta,
  PublicKey,
  TokenBalance,
} from "@solana/web3.js";
import {
  BorshCoder,
  EventParser,
  Idl,
  BorshInstructionCoder,
  Instruction,
} from "@coral-xyz/anchor";
import {
  BaseEvent,
  TransactionEventsParser,
  TransactionEventsParserFactory,
} from "../chain/event";
import { InitCommitmentType, StakingType } from "./constant";
import { InstructionDisplay } from "@coral-xyz/anchor/dist/cjs/coder/borsh/instruction";
import { CONSTANT } from "../constant";

const SOLANA_ANCHOR_EVENT = "solana.anchor.event";
const SOLANA_SPL_EVENT = "solana.spl.event";
const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export enum PermissionlessActionType {
  Stake = "stake",
  Unstake = "unstake",
  ClaimRewards = "claimRewards",
}

export class PermissionlessEvent extends BaseEvent {
  static eventNames(): string[] {
    return ["PermissionlessEvent"];
  }
}

export class PermissionlessStakeEvent extends PermissionlessEvent {
  userAddress: string;
  amount: number;
  stakeAt: number;

  constructor(event: BaseEvent, userAddress: string, amount: number, stakeAt: number) {
    super(event);
    this.userAddress = event.userAddress;
    this.amount = event.amount;
    this.stakeAt = event.stakeAt;
  }

  getActionType(): string {
    return PermissionlessActionType.Stake;
  }

  getActionData(modeName: string) {
    return {
      shares: this.shares.toString(),
      mode: modeName,
    };
  }
}

export class SPLTransferEvent extends PermissionlessEvent {
  static eventNames(): string[] {
    return ["Transfer", "TransferChecked"];
  }

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
  memo?: HumaMemo;

  toDepositEvents(): PermissionlessDepositEvent[] {
    const events = new Array<PermissionlessDepositEvent>();
    for (const to of this.tos) {
      if (this.memo && this.memo.walletAddress === to.address) {
        const event = new PermissionlessDepositEvent(this);
        event.investor = to.address;
        event.shares = to.amount;
        event.amount = BigInt(this.memo.amount);
        event.commitment = this.memo.commitment;
        events.push(event);
      } else {
        const event = new PermissionlessTransferToEvent(this);
        event.investor = to.address;
        event.shares = to.amount;
        events.push(event);
      }
    }
    return events;
  }

  toWithdrawEvents(): PermissionlessWithdrawEvent[] {
    const events = new Array<PermissionlessWithdrawEvent>();
    for (const from of this.froms) {
      const event = new PermissionlessTransferFromEvent(this);
      event.investor = from.address;
      event.shares = from.amount;
      events.push(event);
    }
    return events;
  }
}

export class PermissionlessSolanaTransactionEventsParser
  implements TransactionEventsParser
{
  private anchorEventParser: PermissionlessSolanaTransactionAnchorEventsParser;
  private splEventParser: SolanaSPLTransactionEventsParser;

  constructor(chainId: number, tokenMints: string[]) {
    this.anchorEventParser =
      new PermissionlessSolanaTransactionAnchorEventsParser(chainId);
    this.splEventParser = new SolanaSPLTransactionEventsParser(
      chainId,
      tokenMints
    );
  }

  addEventClass(eventClass: typeof PermissionlessEvent) {
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
    if (events.length > 0) {
      return events;
    } else {
      return this.splEventParser.parseEvents(data);
    }
  }
}

class PermissionlessSolanaTransactionAnchorEventsParser
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
    const programId = new PublicKey(PermissionlessIDL.address);
    const coder = new BorshCoder(PermissionlessIDL as Idl);
    const ep = new EventParser(programId, coder);
    const logs = ep.parseLogs(ptx.meta.logMessages);
    let next;
    try {
      next = logs.next();
    } catch (error) {
      console.log(
        `[Error] PermissionlessSolanaTransactionAnchorEventsParser parsing logs: ${ptx.meta.logMessages} failed, tx: ${data.sig}, error: ${error}`
      );
      return events;
    }
    while (!next.done) {
      const eventValue = next.value;
      if (eventValue) {
        const baseEvent = BaseEvent.build(
          this.chainId,
          ptx.slot,
          data.sig,
          ptx.blockTime,
          ptx.meta.err ? "failed" : "success"
        );
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
  private parseEvent(baseEvent: BaseEvent, data: any): BaseEvent {
    let event = null;
    const eventData = data;
    if (PermissionlessDepositEvent.eventNames().includes(eventData.name)) {
      event = new PermissionlessDepositEvent(baseEvent);
      event.modeConfigAddress = eventData.data.mode_config.toString();
      event.investor = eventData.data.depositor.toString();
      event.shares = BigInt(eventData.data.shares.toString());
      event.amount = BigInt(eventData.data.assets.toString());
      event.commitment = eventData.data.commitment.toString();
    } else if (
      PermissionlessWithdrawEvent.eventNames().includes(eventData.name)
    ) {
      event = new PermissionlessWithdrawEvent(baseEvent);
      event.investor = eventData.data.lender.toString();
      event.shares = BigInt(eventData.data.shares_processed.toString());
      event.amount = BigInt(eventData.data.amount_processed.toString());
      event.requestId = eventData.data.request_id.toString();
    } else if (
      PermissionlessSwitchModeEvent.eventNames().includes(eventData.name)
    ) {
      event = new PermissionlessSwitchModeEvent(baseEvent);
      event.modeConfigAddress = eventData.data.source_mode_config.toString();
      event.investor = eventData.data.lender.toString();
      event.investmentId = eventData.data.investment_id.toString();
      event.targetModeConfigAddress =
        eventData.data.destination_mode_config.toString();
      event.sourceShares = BigInt(
        eventData.data.source_shares_burned.toString()
      );
      event.targetShares = BigInt(
        eventData.data.destination_shares_minted.toString()
      );
    } else if (
      PermissionlessAddRedemptionRequestEvent.eventNames().includes(
        eventData.name
      )
    ) {
      event = new PermissionlessAddRedemptionRequestEvent(baseEvent);
      event.modeConfigAddress = eventData.data.mode_config.toString();
      event.investor = eventData.data.lender.toString();
      event.requestId = eventData.data.request_id.toString();
      event.shares = BigInt(eventData.data.shares.toString());
    } else if (
      PermissionlessCancelRedemptionRequestEvent.eventNames().includes(
        eventData.name
      )
    ) {
      event = new PermissionlessCancelRedemptionRequestEvent(baseEvent);
      event.modeConfigAddress = eventData.data.mode_config.toString();
      event.investor = eventData.data.lender.toString();
      event.requestId = eventData.data.request_id.toString();
      event.shares = BigInt(eventData.data.shares.toString());
    }

    return event;
  }
}

class SolanaSPLTransactionEventsParser implements TransactionEventsParser {
  private static readonly LOG_PREFIX = `Program log: Instruction: `;

  private chainId: number;
  // TODO tokenMints as a member looks not good
  private tokenMints: string[];
  private monitorLogs: Set<string> = new Set();

  constructor(chainId: number, tokenMints: string[]) {
    this.chainId = chainId;
    this.tokenMints = tokenMints;
  }

  addEventClass(eventClass: typeof PermissionlessEvent) {
    eventClass.eventNames().forEach((eventName) => {
      this.monitorLogs.add(
        SolanaSPLTransactionEventsParser.LOG_PREFIX + eventName
      );
    });
  }

  // data type is {tx: ParsedTransactionWithMeta, sig: string}
  // tx is solana web3 library's ParsedTransactionWithMeta type
  // sig is transaction hash
  parseEvents(data: any): BaseEvent[] {
    const ptx = data.tx as ParsedTransactionWithMeta;
    const events = new Array<BaseEvent>();
    let eventName;
    for (const log of ptx.meta.logMessages) {
      if (this.monitorLogs.has(log)) {
        eventName = log.split(":")[2].trim();
        break;
      }
    }

    if (eventName) {
      const baseEvent = BaseEvent.build(
        this.chainId,
        ptx.slot,
        data.sig,
        ptx.blockTime,
        ptx.meta.err ? "failed" : "success"
      );

      if (SPLTransferEvent.eventNames().includes(eventName)) {
        let memo: HumaMemo;
        for (const tokenMint of this.tokenMints) {
          const event = this.parseSPLTransferEvent(baseEvent, ptx, tokenMint);
          if (event) {
            event.monitorAddress = tokenMint;
            if (!memo) {
              memo = this.parsePSTMarketMemo(ptx);
            }
            event.memo = memo;
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
  ): SPLTransferEvent {
    let event = null;
    const accountIndexes = new Set<number>();
    const preTokenBalanceMap = new Map<number, TokenBalance>();
    tx.meta.preTokenBalances.forEach((tokenbalance) => {
      if (tokenbalance.mint === tokenMint) {
        accountIndexes.add(tokenbalance.accountIndex);
        preTokenBalanceMap.set(tokenbalance.accountIndex, tokenbalance);
      }
    });
    const postTokenBalanceMap = new Map<number, TokenBalance>();
    tx.meta.postTokenBalances.forEach((tokenbalance) => {
      if (tokenbalance.mint === tokenMint) {
        accountIndexes.add(tokenbalance.accountIndex);
        postTokenBalanceMap.set(tokenbalance.accountIndex, tokenbalance);
      }
    });

    // console.log(
    //   `accountIndexes: ${JSON.stringify(Array.from(accountIndexes))}, preTokenBalanceMap: ${JSON.stringify(
    //     Array.from(preTokenBalanceMap.values())
    //   )}, postTokenBalanceMap: ${JSON.stringify(
    //     Array.from(postTokenBalanceMap.values())
    //   )}`
    // );

    const froms = new Array<{ address: string; amount: bigint }>();
    const tos = new Array<{ address: string; amount: bigint }>();
    for (const accountIndex of accountIndexes) {
      const preTokenBalance = preTokenBalanceMap.get(accountIndex);
      const postTokenBalance = postTokenBalanceMap.get(accountIndex);
      if (preTokenBalance && postTokenBalance) {
        // console.log(
        //   `preTokenBalance: ${JSON.stringify(preTokenBalance)}, postTokenBalance: ${JSON.stringify(postTokenBalance)}`
        // );
        const preAmount = BigInt(preTokenBalance.uiTokenAmount.amount);
        const postAmount = BigInt(postTokenBalance.uiTokenAmount.amount);
        if (preAmount > postAmount) {
          froms.push({
            address: preTokenBalance.owner,
            amount: preAmount - postAmount,
          });
        } else if (preAmount < postAmount) {
          tos.push({
            address: postTokenBalance.owner,
            amount: postAmount - preAmount,
          });
        }
      } else if (preTokenBalance && !postTokenBalance) {
        const preAmount = BigInt(preTokenBalance.uiTokenAmount.amount);
        if (preAmount > 0n) {
          froms.push({
            address: preTokenBalance.owner,
            amount: preAmount,
          });
        }
      } else if (!preTokenBalance && postTokenBalance) {
        const postAmount = BigInt(postTokenBalance.uiTokenAmount.amount);
        if (postAmount > 0n) {
          tos.push({
            address: postTokenBalance.owner,
            amount: postAmount,
          });
        }
      }
    }

    if (froms.length > 0 && tos.length > 0) {
      event = new SPLTransferEvent(baseEvent);
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
      event.froms = Array.from(fromsMap.values());
      event.tos = Array.from(tosMap.values());
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

  private parsePSTMarketMemo(
    tx: ParsedTransactionWithMeta
  ): HumaMemo | undefined {
    // Process all memo instructions in the transaction
    for (const instruction of tx.transaction.message.instructions) {
      // Check if this is a memo instruction
      const programIdString = instruction.programId.toBase58();
      if (programIdString === MEMO_PROGRAM_ID) {
        // Check if this is a parsed instruction with memo data
        if ("parsed" in instruction) {
          const humaMemo = HumaMemo.parse(instruction.parsed);
          if (humaMemo) {
            return humaMemo;
          } else {
            console.log(
              `[Warning] Invalid huma memo, parsed: ${instruction.parsed}`
            );
          }
        }
      }
    }

    return undefined;
  }
}

export class PermissionlessTransactionEventsParserFactory
  implements TransactionEventsParserFactory
{
  createTransactionEventsParser(
    chainId: number,
    sources: string[],
    eventClasses: (typeof BaseEvent)[]
  ): TransactionEventsParser {
    const parser = new PermissionlessSolanaTransactionEventsParser(
      chainId,
      sources
    );
    eventClasses.forEach((eventClass) =>
      parser.addEventClass(eventClass as typeof PermissionlessEvent)
    );
    return parser;
  }
}

export class HumaStakingEvent extends BaseEvent {
  static eventNames(): string[] {
    return ["HumaStakingEvent"];
  }

  ownerAddress: string;
  entryIndex: number;
  amount: bigint;
  actionType: string;

  getActionType(): string {
    return this.actionType;
  }

  getActionData(entry: StakingEntryData) {
    return {
      ownerAddress: this.ownerAddress,
      entryIndex: this.entryIndex,
      amount: this.amount.toString(),
      entry,
    };
  }
}

export type StakingEntryData = {
  entryIndex: number;
  type: string;
  startsAt: number;
  endsAt: number;
};

export class HumaStakeEvent extends HumaStakingEvent {
  static eventNames(): string[] {
    return ["deposit"];
  }

  getActionType(): string {
    return "humaStaking";
  }

  toDepositEvent(): HumaDepositEvent {
    const event = new HumaDepositEvent(this);
    event.ownerAddress = this.ownerAddress;
    event.entryIndex = this.entryIndex;
    event.amount = this.amount;
    event.actionType = "humaStaking";
    return event;
  }
}

export class HumaUnstakeEvent extends HumaStakingEvent {
  static eventNames(): string[] {
    return ["withdraw"];
  }

  getActionType(): string {
    return "humaUnstaking";
  }

  toWithdrawEvent(): HumaWithdrawEvent {
    const event = new HumaWithdrawEvent(this);
    event.ownerAddress = this.ownerAddress;
    event.entryIndex = this.entryIndex;
    event.amount = this.amount;
    event.actionType = "humaUnstaking";
    return event;
  }
}

export class HumaCreateDepositEntryEvent extends HumaStakingEvent {
  static eventNames(): string[] {
    return ["create_deposit_entry"];
  }

  type: StakingType;
  startTS: number;
  endTS: number;

  getActionType(): string {
    return "humaCreateDepositEntry";
  }
}

export class HumaCloseDepositEntryEvent extends HumaStakingEvent {
  static eventNames(): string[] {
    return ["close_deposit_entry"];
  }

  getActionType(): string {
    return "humaCloseDepositEntryEvent";
  }
}

export class HumaInternalTransferEvent extends HumaStakingEvent {
  targetEntryIndex: number;

  toDepositEvent(): HumaDepositEvent {
    const event = new HumaDepositEvent(this);
    event.ownerAddress = this.ownerAddress;
    event.entryIndex = this.targetEntryIndex;
    event.amount = this.amount;
    event.actionType = "humaInternalTransferTo";
    return event;
  }

  toWithdrawEvent(): HumaWithdrawEvent {
    const event = new HumaWithdrawEvent(this);
    event.ownerAddress = this.ownerAddress;
    event.entryIndex = this.entryIndex;
    event.amount = this.amount;
    event.actionType = "humaInternalTransferFrom";
    return event;
  }

  getActionType(): string {
    return "humaInternalTransfer";
  }
}

export class HumaInternalTransferLockedEvent extends HumaInternalTransferEvent {
  static eventNames(): string[] {
    return ["internal_transfer_locked"];
  }

  getActionType(): string {
    return "humaInternalTransferLocked";
  }
}

export class HumaInternalTransferUnlockedEvent extends HumaInternalTransferEvent {
  static eventNames(): string[] {
    return ["internal_transfer_unlocked"];
  }

  getActionType(): string {
    return "humaInternalTransferUnlocked";
  }
}

export class HumaDepositEvent extends HumaStakingEvent {}

export class HumaWithdrawEvent extends HumaStakingEvent {}

export class HumaResetLockupEvent extends HumaStakingEvent {
  static eventNames(): string[] {
    return ["reset_lockup"];
  }

  type: StakingType;
  startTS: number;
  endTS: number;

  getActionType(): string {
    return "humaResetLockupEvent";
  }
}

export class HumaStakingEventsParser implements TransactionEventsParser {
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
    const idl = VoterStakeRegistryDevnetIDL;

    const targetInstructions = [
      ...HumaCreateDepositEntryEvent.eventNames(),
      ...HumaCloseDepositEntryEvent.eventNames(),
      ...HumaStakeEvent.eventNames(),
      ...HumaUnstakeEvent.eventNames(),
      ...HumaInternalTransferLockedEvent.eventNames(),
      ...HumaInternalTransferUnlockedEvent.eventNames(),
      ...HumaResetLockupEvent.eventNames(),
    ];

    const accountMetaMap = new Map<string, AccountMeta>();
    ptx.transaction.message.accountKeys.forEach((account) => {
      accountMetaMap.set(account.pubkey.toString(), {
        pubkey: account.pubkey,
        isSigner: account.signer,
        isWritable: account.writable,
      });
    });

    const coder = new BorshInstructionCoder(idl as Idl);
    // iterate through all instructions in transaction, find matching instruction
    for (let i = 0; i < ptx.transaction.message.instructions.length; i++) {
      const instruction: any = ptx.transaction.message.instructions[i];

      // if it is program instruction and from specified program
      if (instruction.programId.toBase58() === idl.address) {
        const instructionData: Instruction = coder.decode(
          instruction.data,
          "base58"
        );
        if (!instructionData) {
          console.log(
            `[Warning] Failed to decode instruction, txhash: ${data.sig}, instruction: ${instruction.data}`
          );
          continue;
        }

        if (!targetInstructions.includes(instructionData.name)) {
          continue;
        }

        const accountMetas = new Array<AccountMeta>();
        for (const pubkey of instruction.accounts) {
          const accountMeta = accountMetaMap.get(pubkey.toString());
          if (accountMeta) {
            accountMetas.push(accountMeta);
          }
        }
        const instructionDisplay = coder.format(instructionData, accountMetas);
        // console.log(`instructionData: ${JSON.stringify(instructionData)}`);
        // console.log(
        //   `instructionDisplay: ${JSON.stringify(instructionDisplay)}`
        // );
        if (!instructionDisplay) {
          console.log(
            `[Warning] Failed to format instruction, txhash: ${data.sig}, instructionData: ${instructionData}`
          );
          continue;
        }

        const baseEvent = BaseEvent.build(
          this.chainId,
          ptx.slot,
          `${data.sig}.${i}`,
          ptx.blockTime,
          ptx.meta.err ? "failed" : "success"
        );
        const event = this.parseEvent(
          baseEvent,
          instructionData,
          instructionDisplay
        );
        if (event) {
          events.push(event);
        }
      }
    }

    return events;
  }

  private parseEvent(
    baseEvent: BaseEvent,
    instruction: Instruction,
    instructionDisplay: InstructionDisplay
  ): HumaStakingEvent {
    let event = null;
    if (HumaStakeEvent.eventNames().includes(instruction.name)) {
      event = new HumaStakeEvent(baseEvent);
      const ixData = instruction.data as any;
      event.amount = BigInt(ixData.amount);
      event.entryIndex = ixData.deposit_entry_index;
      event.ownerAddress = this.parseOwnerAddress(
        instructionDisplay,
        (account) => account.name.toLowerCase() === "deposit_authority"
      );
    } else if (HumaUnstakeEvent.eventNames().includes(instruction.name)) {
      event = new HumaUnstakeEvent(baseEvent);
      const ixData = instruction.data as any;
      event.amount = BigInt(ixData.amount);
      event.entryIndex = ixData.deposit_entry_index;
      event.ownerAddress = this.parseOwnerAddress(
        instructionDisplay,
        (account) => account.name.toLowerCase() === "voter_authority"
      );
    } else if (
      HumaCreateDepositEntryEvent.eventNames().includes(instruction.name)
    ) {
      event = new HumaCreateDepositEntryEvent(baseEvent);
      const ixData = instruction.data as any;
      event.entryIndex = ixData.deposit_entry_index;
      event.type = this.parseStakingType(ixData.kind);
      event.startTS = ixData.start_ts;
      if (!event.startTS) {
        event.startTS = event.timestamp;
      }
      if (ixData.periods > 0) {
        event.endTS = event.startTS + ixData.periods * CONSTANT.secondsInDay;
      }
      event.ownerAddress = this.parseOwnerAddress(
        instructionDisplay,
        (account) => account.name.toLowerCase() === "voter_authority"
      );
    } else if (
      HumaCloseDepositEntryEvent.eventNames().includes(instruction.name)
    ) {
      event = new HumaCloseDepositEntryEvent(baseEvent);
      const ixData = instruction.data as any;
      event.entryIndex = ixData.deposit_entry_index;
      event.ownerAddress = this.parseOwnerAddress(
        instructionDisplay,
        (account) => account.name.toLowerCase() === "voter_authority"
      );
    } else if (
      HumaInternalTransferLockedEvent.eventNames().includes(instruction.name)
    ) {
      event = new HumaInternalTransferLockedEvent(baseEvent);
      const ixData = instruction.data as any;
      event.amount = BigInt(ixData.amount);
      event.entryIndex = ixData.source_deposit_entry_index;
      event.targetEntryIndex = ixData.target_deposit_entry_index;
      event.ownerAddress = this.parseOwnerAddress(
        instructionDisplay,
        (account) => account.name.toLowerCase() === "voter_authority"
      );
    } else if (
      HumaInternalTransferUnlockedEvent.eventNames().includes(instruction.name)
    ) {
      event = new HumaInternalTransferUnlockedEvent(baseEvent);
      const ixData = instruction.data as any;
      event.amount = BigInt(ixData.amount);
      event.entryIndex = ixData.source_deposit_entry_index;
      event.targetEntryIndex = ixData.target_deposit_entry_index;
      event.ownerAddress = this.parseOwnerAddress(
        instructionDisplay,
        (account) => account.name.toLowerCase() === "voter_authority"
      );
    } else if (HumaResetLockupEvent.eventNames().includes(instruction.name)) {
      event = new HumaResetLockupEvent(baseEvent);
      const ixData = instruction.data as any;
      event.entryIndex = ixData.deposit_entry_index;
      event.type = this.parseStakingType(ixData.kind);
      event.startTS = event.timestamp;
      if (ixData.periods > 0) {
        event.endTS = event.startTS + ixData.periods * CONSTANT.secondsInDay;
      }
      event.ownerAddress = this.parseOwnerAddress(
        instructionDisplay,
        (account) => account.name.toLowerCase() === "voter_authority"
      );
    }
    return event;
  }

  private parseOwnerAddress(
    instructionDisplay: InstructionDisplay,
    predicate: (account: {
      name?: string;
      pubkey: PublicKey;
      isSigner: boolean;
      isWritable: boolean;
    }) => boolean
  ): string | null {
    const index = instructionDisplay.accounts.findIndex(predicate);
    if (index >= 0) {
      return instructionDisplay.accounts[index].pubkey.toString();
    } else {
      console.log(
        `[Warning] Failed to find voter authority account, instructionDisplay: ${JSON.stringify(
          instructionDisplay
        )}`
      );
      return null;
    }
  }

  private parseStakingType(kind: Record<string, unknown>): StakingType {
    const stakingTypeKey = Object.keys(kind)[0];
    let stakingType = StakingType[stakingTypeKey as keyof typeof StakingType];
    if (stakingType === undefined) {
      stakingType = StakingType.None;
    }
    return stakingType;
  }
}
