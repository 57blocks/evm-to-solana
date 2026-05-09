import { EventType } from "../../domain-models";

export interface BaseEventProps {
  chainId: number;
  contractAddress: string;
  userAddress: string;
  eventType: EventType;
  amount: bigint;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  timestamp: number;
}

export abstract class BaseEvent {
  readonly chainId: number;
  readonly contractAddress: string;
  readonly userAddress: string;
  readonly eventType: EventType;
  readonly amount: bigint;
  readonly blockNumber: number;
  readonly transactionHash: string;
  readonly logIndex: number;
  readonly timestamp: number;

  protected constructor(props: BaseEventProps) {
    this.chainId = props.chainId;
    this.contractAddress = props.contractAddress.toLowerCase();
    this.userAddress = props.userAddress.toLowerCase();
    this.eventType = props.eventType;
    this.amount = props.amount;
    this.blockNumber = props.blockNumber;
    this.transactionHash = props.transactionHash.toLowerCase();
    this.logIndex = props.logIndex;
    this.timestamp = props.timestamp;
  }
}
