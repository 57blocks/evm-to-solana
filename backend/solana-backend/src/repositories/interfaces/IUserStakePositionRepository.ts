import { UserStakeStatus } from "../../domain-models";

/**
 * UserStakePositionRepository 接口
 * 从Solana链上查询用户质押状态
 */
export interface IUserStakePositionRepository {
  /**
   * 获取用户质押状态
   * @param userAddress 用户地址
   * @param programId 程序ID
   * @param stakingMint 质押代币类型
   * @param stateSeed PDA seed，默认 "state"
   * @param stakeSeed PDA seed，默认 "stake"
   */
  getUserStakePosition(
    userAddress: string,
    programId: string,
    stakingMint: string,
    stateSeed?: string,
    stakeSeed?: string
  ): Promise<UserStakeStatus | null>;
}

