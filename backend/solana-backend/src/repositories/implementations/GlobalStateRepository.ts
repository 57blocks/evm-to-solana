import { PublicKey } from "@solana/web3.js";
import { GlobalState } from "../../domain-models";
import { IGlobalStateRepository } from "../interfaces/IGlobalStateRepository";
import { SolanaConnections } from "../../infrastructure";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import StakingIDL from "../../solana_staking.json";

/**
 * GlobalStateRepository 实现
 * 从Solana链上查询全局状态
 */
export class GlobalStateRepository implements IGlobalStateRepository {
  private solanaConnections: SolanaConnections;
  private chainId: number;
  constructor(solanaConnections: SolanaConnections, chainId: number) {
    this.solanaConnections = solanaConnections;
    this.chainId = chainId;
  }

  /**
   * 获取全局状态
   */
  async getGlobalState(
    programId: string,
    stakingMint: string,
    stateSeed: string = "state"
  ): Promise<GlobalState> {
    const programPubkey = new PublicKey(programId);
    const stakingMintPubkey = new PublicKey(stakingMint);

    // 推导 GlobalState 的 PDA
    const [statePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(stateSeed), stakingMintPubkey.toBuffer()],
      programPubkey
    );

    // 查询账户数据
    const connection = this.solanaConnections.getConnection(this.chainId);
    const accountInfo = await connection.getAccountInfo(statePda);
    if (!accountInfo) {
      throw new Error(
        `GlobalState account not found at PDA: ${statePda.toBase58()}`
      );
    }

    const coder = new BorshCoder(StakingIDL as Idl);
    const decodedState = coder.accounts.decode("GlobalState", accountInfo.data) as {
      admin: PublicKey;
      stakingMint: PublicKey;
      rewardMint: PublicKey;
      stakingVault: PublicKey;
      rewardVault: PublicKey;
      rewardRate: number;
      totalStaked: bigint;
      bump: number;
    };
    return GlobalState.fromChainData({
      admin: decodedState.admin.toBase58(),
      stakingMint: decodedState.stakingMint.toBase58(),
      rewardMint: decodedState.rewardMint.toBase58(),
      stakingVault: decodedState.stakingVault.toBase58(),
      rewardVault: decodedState.rewardVault.toBase58(),
      rewardRate: decodedState.rewardRate,
      totalStaked: decodedState.totalStaked,
    });
  }
}

