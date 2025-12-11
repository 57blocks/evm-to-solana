import { PublicKey } from "@solana/web3.js";
import { GlobalState } from "../../domain-models";
import { IGlobalStateRepository } from "../interfaces/IGlobalStateRepository";
import { SolanaService } from "../../infrastructure";

/**
 * GlobalStateRepository 实现
 * 从Solana链上查询全局状态
 */
export class GlobalStateRepository implements IGlobalStateRepository {
  constructor(
    private solanaService: SolanaService,
    private chainId: number
  ) {}

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
    const connection = this.solanaService.getConnection(this.chainId);
    const accountInfo = await connection.getAccountInfo(statePda);
    if (!accountInfo) {
      throw new Error(
        `GlobalState account not found at PDA: ${statePda.toBase58()}`
      );
    }

    // 解析账户数据（根据合约结构）
    // 注意：这里需要根据实际的合约数据结构来解析
    // 假设数据格式为：
    // - admin: Pubkey (32 bytes)
    // - staking_mint: Pubkey (32 bytes)
    // - reward_mint: Pubkey (32 bytes)
    // - staking_vault: Pubkey (32 bytes)
    // - reward_vault: Pubkey (32 bytes)
    // - reward_rate: u64 (8 bytes)
    // - total_staked: u64 (8 bytes)
    // - bump: u8 (1 byte)
    // 前面可能有 discriminator (8 bytes)

    const data = accountInfo.data;
    let offset = 8; // 跳过 discriminator (假设是 8 bytes)

    const admin = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const stakingMintFromChain = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const rewardMint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const stakingVault = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const rewardVault = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const rewardRate = data.readBigUInt64LE(offset);
    offset += 8;

    const totalStaked = data.readBigUInt64LE(offset);

    return GlobalState.fromChainData({
      admin: admin.toBase58(),
      stakingMint: stakingMintFromChain.toBase58(),
      rewardMint: rewardMint.toBase58(),
      stakingVault: stakingVault.toBase58(),
      rewardVault: rewardVault.toBase58(),
      rewardRate: Number(rewardRate),
      totalStaked: totalStaked,
    });
  }
}

