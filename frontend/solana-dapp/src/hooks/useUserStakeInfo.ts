import { useProgram } from "../../hooks/useProgram";
import { PublicKey } from "@solana/web3.js";
import { createStakingAccount } from "@/utils/account";
import { convertFromLamports, formatTimestamp } from "@/utils/tokenUtils";
export type UserStakeInfo = {
  owner: PublicKey;
  amount: number;
  stakeTimestamp: string;
  lastClaimTime: string;
  rewardDebt: number;
};
const useUserStakeInfo = () => {
  const { program } = useProgram();

  const fetchUserStakeInfo = async (
    publicKey: PublicKey
  ): Promise<UserStakeInfo | undefined> => {
    if (!program) {
      console.log("Program is not ready yet");
      return undefined;
    }

    const { userStakeInfoPda } = await createStakingAccount(publicKey);
    const userStakeInfo = await program.account.userStakeInfo.fetch(
      userStakeInfoPda
    );
    if (!userStakeInfo) {
      return undefined;
    }
    const stakeAmount = convertFromLamports(userStakeInfo?.amount ?? BigInt(0));
    const rewardDebt = convertFromLamports(
      userStakeInfo.rewardDebt ?? BigInt(0)
    );

    return {
      owner: userStakeInfo.owner,
      amount: stakeAmount,
      rewardDebt: rewardDebt,
      stakeTimestamp: formatTimestamp(userStakeInfo.stakeTimestamp),
      lastClaimTime: formatTimestamp(userStakeInfo.lastClaimTime),
    };
  };

  return { fetchUserStakeInfo };
};

export default useUserStakeInfo;
