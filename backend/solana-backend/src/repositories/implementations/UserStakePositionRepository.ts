import { PublicKey } from "@solana/web3.js";
import { UserStakeStatus } from "../../domain-models";
import { IUserStakePositionRepository } from "../interfaces/IUserStakePositionRepository";
import { SolanaConnections } from "../../infrastructure";

/**
 * UserStakePositionRepository 实现
 * 从Solana链上查询用户质押状态
 */
export class UserStakePositionRepository
  implements IUserStakePositionRepository
{
  constructor(
    private solanaConnections: SolanaConnections,
    private chainId: number
  ) {}

  /**
   * 获取用户质押状态
   */
  async getUserStakePosition(
    userAddress: string,
    programId: string,
    stakingMint: string,
    stateSeed: string = "state",
    stakeSeed: string = "stake"
  ): Promise<UserStakeStatus | null> {
    const programPubkey = new PublicKey(programId);
    const stakingMintPubkey = new PublicKey(stakingMint);
    const userPubkey = new PublicKey(userAddress);

    // 步骤1: 推导 GlobalState 的 PDA
    const [statePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(stateSeed), stakingMintPubkey.toBuffer()],
      programPubkey
    );

    // 步骤2: 推导 UserStakeInfo 的 PDA
    const [stakePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(stakeSeed), statePda.toBuffer(), userPubkey.toBuffer()],
      programPubkey
    );

    // 查询账户数据
    const connection = this.solanaConnections.getConnection(this.chainId);
    const accountInfo = await connection.getAccountInfo(stakePda);
    if (!accountInfo) {
      // 账户不存在，返回 null
      return null;
    }

    // 解析账户数据（根据合约结构）
    // 假设数据格式为：
    // - owner: Pubkey (32 bytes)
    // - amount: u64 (8 bytes)
    // - stake_timestamp: i64 (8 bytes)
    // - last_claim_time: i64 (8 bytes)
    // - reward_debt: u64 (8 bytes)
    // - bump: u8 (1 byte)
    // 前面可能有 discriminator (8 bytes)

    const data = accountInfo.data;
    let offset = 8; // 跳过 discriminator (假设是 8 bytes)

    const owner = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const amount = data.readBigUInt64LE(offset);
    offset += 8;

    const stakeTimestamp = Number(data.readBigInt64LE(offset));
    offset += 8;

    const lastClaimTime = Number(data.readBigInt64LE(offset));
    offset += 8;

    const rewardDebt = data.readBigUInt64LE(offset);

    return UserStakeStatus.fromChainData({
      owner: owner.toBase58(),
      amount: amount,
      stakeTimestamp: stakeTimestamp,
      lastClaimTime: lastClaimTime,
      rewardDebt: rewardDebt,
      pendingRewards: BigInt(0), // 待计算
    });
  }
}

