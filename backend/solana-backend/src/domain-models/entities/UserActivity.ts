/**
 * 事件类型
 */
export enum EventType {
  Staked = "Staked",
  Unstaked = "Unstaked",
  RewardsClaimed = "RewardsClaimed",
  PoolCreated = "PoolCreated",
  RewardsFunded = "RewardsFunded",
  PoolClosed = "PoolClosed",
  UserStakeAccountClosed = "UserStakeAccountClosed",
  RemainingRewardsWithdrawn = "RemainingRewardsWithdrawn",
  AddedToBlacklist = "AddedToBlacklist",
  RemovedFromBlacklist = "RemovedFromBlacklist",
}

/**
 * UserActivity (用户活动记录)
 * 用户在质押协议中的所有操作历史记录
 */
export class UserActivity {
  public readonly userAddress: string;
  public readonly poolConfig: string; // 所属 pool（PoolConfig PDA base58）
  public readonly eventType: EventType;
  public readonly positionDelta: bigint;
  public readonly rewards: bigint;
  public readonly blockNumber: number;
  public readonly txHash: string;
  public readonly timestamp: number;

  constructor(
    userAddress: string,
    poolConfig: string,
    eventType: EventType,
    positionDelta: bigint,
    rewards: bigint,
    blockNumber: number,
    txHash: string,
    timestamp: number
  ) {
    if (timestamp < 0) {
      throw new Error("Timestamp must be non-negative");
    }
    this.userAddress = userAddress;
    this.poolConfig = poolConfig;
    this.eventType = eventType;
    this.positionDelta = positionDelta;
    this.rewards = rewards;
    this.blockNumber = blockNumber;
    this.txHash = txHash;
    this.timestamp = timestamp;
  }

  static createStakedActivity(
    userAddress: string,
    poolConfig: string,
    amount: bigint,
    blockNumber: number,
    txHash: string,
    timestamp: number,
  ): UserActivity {
    return new UserActivity(
      userAddress,
      poolConfig,
      EventType.Staked,
      amount,
      0n,
      blockNumber,
      txHash,
      timestamp
    );
  }

  static createUnstakedActivity(
    userAddress: string,
    poolConfig: string,
    amount: bigint,
    blockNumber: number,
    txHash: string,
    timestamp: number,
  ): UserActivity {
    return new UserActivity(
      userAddress,
      poolConfig,
      EventType.Unstaked,
      -amount,
      0n,
      blockNumber,
      txHash,
      timestamp
    );
  }

  static createRewardsClaimedActivity(
    userAddress: string,
    poolConfig: string,
    amount: bigint,
    blockNumber: number,
    txHash: string,
    timestamp: number,
  ): UserActivity {
    return new UserActivity(
      userAddress,
      poolConfig,
      EventType.RewardsClaimed,
      0n,
      amount,
      blockNumber,
      txHash,
      timestamp
    );
  }
}
