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
      staking_mint: PublicKey;
      reward_mint: PublicKey;
      staking_vault: PublicKey;
      reward_vault: PublicKey;
      reward_rate: bigint; // u64 in IDL
      total_staked: bigint; // u64 in IDL
      bump: number;
    };
    return GlobalState.fromChainData({
      admin: decodedState.admin.toBase58(),
      stakingMint: decodedState.staking_mint.toBase58(),
      rewardMint: decodedState.reward_mint.toBase58(),
      stakingVault: decodedState.staking_vault.toBase58(),
      rewardVault: decodedState.reward_vault.toBase58(),
      rewardRate: Number(decodedState.reward_rate), // Convert bigint to number
      totalStaked: decodedState.total_staked,
    });
  }
}

