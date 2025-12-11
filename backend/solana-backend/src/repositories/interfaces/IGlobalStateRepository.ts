import { GlobalState } from "../../domain-models";

/**
 * GlobalStateRepository 接口
 * 从Solana链上查询全局状态
 */
export interface IGlobalStateRepository {
  /**
   * 获取全局状态
   * @param programId 程序ID
   * @param stakingMint 质押代币类型
   * @param stateSeed PDA seed，默认 "state"
   */
  getGlobalState(
    programId: string,
    stakingMint: string,
    stateSeed?: string
  ): Promise<GlobalState>;
}

