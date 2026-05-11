export type EventType =
  | "Staked"
  | "Unstaked"
  | "RewardClaimed"
  | "RewardsFunded"
  | "RemainingRewardsWithdrawn";

export interface UserActivityProps {
  chainId: number;
  contractAddress: string;
  userAddress: string;
  eventType: EventType;
  amount: bigint;
  blockNumber: number;
  txHash: string;
  logIndex: number;
  timestamp: number;
}

export class UserActivity {
  readonly chainId: number;
  readonly contractAddress: string;
  readonly userAddress: string;
  readonly eventType: EventType;
  readonly amount: bigint;
  readonly blockNumber: number;
  readonly txHash: string;
  readonly logIndex: number;
  readonly timestamp: number;

  constructor(props: UserActivityProps) {
    this.chainId = props.chainId;
    this.contractAddress = props.contractAddress.toLowerCase();
    this.userAddress = props.userAddress.toLowerCase();
    this.eventType = props.eventType;
    this.amount = props.amount;
    this.blockNumber = props.blockNumber;
    this.txHash = props.txHash.toLowerCase();
    this.logIndex = props.logIndex;
    this.timestamp = props.timestamp;
  }

  static create(props: UserActivityProps): UserActivity {
    return new UserActivity(props);
  }
}
