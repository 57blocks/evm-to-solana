import { PublicKey } from "@solana/web3.js";
import { UserStakeStatus } from "../../domain-models";
import { IUserStakePositionRepository } from "../interfaces/IUserStakePositionRepository";
import { SolanaConnections } from "../../infrastructure";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import StakingIDL from "../../solana_staking.json";

/**
 * UserStakePositionRepository 实现
 * 从Solana链上查询用户质押状态
 */
export class UserStakePositionRepository implements IUserStakePositionRepository
{
  private solanaConnections: SolanaConnections;
  private chainId: number;
  constructor(
    solanaConnections: SolanaConnections,
    chainId: number
  ) {
    this.solanaConnections = solanaConnections;
    this.chainId = chainId;
  }

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
    const [statePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(stateSeed), stakingMintPubkey.toBuffer()],
      programPubkey
    );
    const [stakePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(stakeSeed), statePda.toBuffer(), userPubkey.toBuffer()],
      programPubkey
    );
    // 查询账户数据
    const connection = this.solanaConnections.getConnection(this.chainId);
    const accountInfo = await connection.getAccountInfo(stakePda);
    if (!accountInfo) {
      return null;
    }
    const coder = new BorshCoder(StakingIDL as Idl);
    const decodedStake = coder.accounts.decode("UserStakeInfo", accountInfo.data) as {
      owner: PublicKey;
      amount: bigint;
      stakeTimestamp: bigint;
      lastClaimTime: bigint;
      rewardDebt: bigint;
      bump: number;
    };
    return UserStakeStatus.fromChainData({
      owner: decodedStake.owner.toBase58(),
      amount: decodedStake.amount,
      stakeTimestamp: decodedStake.stakeTimestamp,
      lastClaimTime: decodedStake.lastClaimTime,
      rewardDebt: decodedStake.rewardDebt,
    });
  }
}

