/**
 * 事件类型
 */
export enum EventType {
  Staked = "Staked",
  Unstaked = "Unstaked",
  RewardsClaimed = "RewardsClaimed",
}

/**
 * UserActivity (用户活动记录)
 * 用户在质押协议中的所有操作历史记录
 */
export class UserActivity {
  public readonly userAddress: string; // Address
  public readonly vaultId: string; // Address
  public readonly eventType: EventType;
  public readonly positionDelta: bigint; // 质押数量的变化量（正数表示增加，负数表示减少）
  public readonly rewards: bigint; // TokenAmount (u64)
  public readonly blockNumber: number; // Slot
  public readonly txHash: string; // TransactionHash
  public readonly timestamp: number; // Unix timestamp

  constructor(
    userAddress: string,
    vaultId: string,
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
    this.vaultId = vaultId;
    this.eventType = eventType;
    this.positionDelta = positionDelta;
    this.rewards = rewards;
    this.blockNumber = blockNumber;
    this.txHash = txHash;
    this.timestamp = timestamp;
  }

  /**
   * 创建Staked事件的UserActivity
   */
  static createStakedActivity(
    userAddress: string,
    vaultId: string,
    amount: bigint,
    rewards: bigint,
    blockNumber: number,
    txHash: string,
    timestamp: number,
  ): UserActivity {
    return new UserActivity(
      userAddress,
      vaultId,
      EventType.Staked,
      amount,
      rewards,
      blockNumber,
      txHash,
      timestamp
    );
  }

  /**
   * 创建Unstaked事件的UserActivity
   */
  static createUnstakedActivity(
    userAddress: string,
    vaultId: string,
    amount: bigint,
    rewards: bigint,
    blockNumber: number,
    txHash: string,
    timestamp: number,
  ): UserActivity {
    return new UserActivity(
      userAddress,
      vaultId,
      EventType.Unstaked,
      -amount,
      rewards,
      blockNumber,
      txHash,
      timestamp
    );
  }

  /**
   * 创建RewardsClaimed事件的UserActivity
   */
  static createRewardsClaimedActivity(
    userAddress: string,
    vaultId: string,
    amount: bigint,
    blockNumber: number,
    txHash: string,
    timestamp: number,
  ): UserActivity {
    return new UserActivity(
      userAddress,
      vaultId,
      EventType.RewardsClaimed,
      0n,
      amount,
      blockNumber,
      txHash,
      timestamp
    );
  }
}

