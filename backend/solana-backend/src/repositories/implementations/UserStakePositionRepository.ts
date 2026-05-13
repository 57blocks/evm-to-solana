import { PublicKey } from "@solana/web3.js";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import { UserStakeStatus } from "../../domain-models";
import { IUserStakePositionRepository } from "../interfaces/IUserStakePositionRepository";
import { IPoolRepository } from "../interfaces/IPoolRepository";
import { RewardCalculationService } from "../../domain-services/RewardCalculationService";
import { SolanaConnections } from "../../infrastructure";
import { POOL_CONFIG_SEED, STAKE_SEED } from "../constants";
import StakingIDL from "../../../idl/solana_staking.json";

interface DecodedUserStake {
  amount: bigint;
  reward_debt: bigint; // i128
  bump: number;
}

export class UserStakePositionRepository implements IUserStakePositionRepository {
  private solanaConnections: SolanaConnections;
  private chainId: string | number;
  private poolRepository: IPoolRepository;
  private rewardCalculator: RewardCalculationService;

  constructor(
    solanaConnections: SolanaConnections,
    chainId: string | number,
    poolRepository: IPoolRepository,
    rewardCalculator: RewardCalculationService
  ) {
    this.solanaConnections = solanaConnections;
    this.chainId = chainId;
    this.poolRepository = poolRepository;
    this.rewardCalculator = rewardCalculator;
  }

  async getUserStakePosition(
    userAddress: string,
    programId: string,
    poolId: string
  ): Promise<UserStakeStatus | null> {
    const programPubkey = new PublicKey(programId);
    const poolIdPubkey = new PublicKey(poolId);
    const userPubkey = new PublicKey(userAddress);

    const [poolConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(POOL_CONFIG_SEED), poolIdPubkey.toBuffer()],
      programPubkey
    );
    const [stakePda] = PublicKey.findProgramAddressSync(
      [Buffer.from(STAKE_SEED), poolConfigPda.toBuffer(), userPubkey.toBuffer()],
      programPubkey
    );

    const connection = this.solanaConnections.getConnection(this.chainId);
    const accountInfo = await connection.getAccountInfo(stakePda);
    if (!accountInfo) {
      return null;
    }

    const coder = new BorshCoder(StakingIDL as Idl);
    const decoded = coder.accounts.decode(
      "UserStakeInfo",
      accountInfo.data
    ) as DecodedUserStake;

    const amount = BigInt(decoded.amount.toString());
    const rewardDebt = BigInt(decoded.reward_debt.toString());

    const { config, state } = await this.poolRepository.getPool(programId, poolId);
    const now = BigInt(Math.floor(Date.now() / 1000));
    const pendingRewards = this.rewardCalculator.pendingRewards(
      { amount, rewardDebt },
      state,
      config,
      now
    );

    return UserStakeStatus.fromChainData({
      userAddress,
      poolConfig: poolConfigPda.toBase58(),
      amount,
      rewardDebt,
      pendingRewards,
      bump: decoded.bump,
    });
  }
}
