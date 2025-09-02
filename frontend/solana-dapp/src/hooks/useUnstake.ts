import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { createStakingAccount } from "../utils/account";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { convertToLamports } from "@/utils/tokenUtils";

export const useUnstake = () => {
  const { publicKey } = useWallet();
  const { program } = useProgram();

  const [isUnstaking, setIsUnstaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unstake = async (unstakeAmount: string) => {
    if (!publicKey || !program) {
      setError("Wallet not connected or program not available");
      return;
    }

    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      setError("Invalid unstake amount");
      return;
    }
    setIsUnstaking(true);
    setError(null);

    try {
      const {
        statePda,
        userStakeInfoPda,
        blacklistPda,
        userTokenAccount,
        userRewardAccount,
      } = await createStakingAccount(publicKey);

      const state = await program.account.globalState.fetch(statePda);

      const transaction = await program.methods
        .unstake(new BN(convertToLamports(unstakeAmount)))
        .accounts({
          user: publicKey,
          //@ts-ignore
          state: statePda,
          userStakeInfo: userStakeInfoPda,
          userTokenAccount: userTokenAccount,
          stakingVault: state.stakingVault,
          rewardVault: state.rewardVault,
          userRewardAccount: userRewardAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          blacklistEntry: blacklistPda,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();
      return { success: true, transaction };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unstaking failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUnstaking(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  return {
    unstake,
    isUnstaking,
    error,
    resetError,
  };
};
