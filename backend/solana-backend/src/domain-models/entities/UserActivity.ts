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
  public readonly programId: string; // Address
  public readonly eventType: EventType;
  public readonly rawData: string;
  public readonly positionDelta: number; // 质押数量的变化量（正数表示增加，负数表示减少）
  public readonly rewards: bigint; // TokenAmount (u64)
  public readonly blockNumber: number; // Slot
  public readonly txHash: string; // TransactionHash
  public readonly timestamp: number; // Unix timestamp

  constructor(
    userAddress: string,
    programId: string,
    eventType: EventType,
    rawData: string,
    positionDelta: number,
    rewards: bigint,
    blockNumber: number,
    txHash: string,
    timestamp: number
  ) {
    if (timestamp < 0) {
      throw new Error("Timestamp must be non-negative");
    }
    this.userAddress = userAddress;
    this.programId = programId;
    this.eventType = eventType;
    this.rawData = rawData;
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
    programId: string,
    amount: number,
    blockNumber: number,
    txHash: string,
    timestamp: number,
    rawData: string
  ): UserActivity {
    return new UserActivity(
      userAddress,
      programId,
      EventType.Staked,
      rawData,
      amount, // 正数表示增加
      BigInt(0),
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
    programId: string,
    amount: number,
    rewards: number | bigint,
    blockNumber: number,
    txHash: string,
    timestamp: number,
    rawData: string
  ): UserActivity {
    return new UserActivity(
      userAddress,
      programId,
      EventType.Unstaked,
      rawData,
      -amount, // 负数表示减少
      typeof rewards === "bigint" ? rewards : BigInt(rewards),
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
    programId: string,
    amount: number | bigint,
    blockNumber: number,
    txHash: string,
    timestamp: number,
    rawData: string
  ): UserActivity {
    return new UserActivity(
      userAddress,
      programId,
      EventType.RewardsClaimed,
      rawData,
      0, // 奖励领取不改变质押数量
      typeof amount === "bigint" ? amount : BigInt(amount),
      blockNumber,
      txHash,
      timestamp
    );
  }
}

