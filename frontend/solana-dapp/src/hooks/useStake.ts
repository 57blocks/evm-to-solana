import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { createStakingAccount } from "../utils/account";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { convertToLamports, ERROR_MESSAGES } from "@/utils/tokenUtils";

export const useStake = () => {
  const { publicKey } = useWallet();
  const { program } = useProgram();
  const [isStaking, setIsStaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stake = async (stakeAmount: string) => {
    if (!publicKey || !program) {
      setError(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setError(ERROR_MESSAGES.INVALID_STAKE_AMOUNT);
      return;
    }

    setIsStaking(true);
    setError(null);

    try {
      // Get staking account addresses
      const {
        statePda,
        userStakeInfoPda,
        blacklistPda,
        userTokenAccount,
        userRewardAccount,
      } = await createStakingAccount(publicKey);

      // Fetch current state
      const state = await program.account.globalState.fetch(statePda);

      const transaction = await program.methods
        .stake(new BN(convertToLamports(stakeAmount)))
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
          systemProgram: anchor.web3.SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();
      // program.addEventListener("staked", (event) => {
      //   console.log("staked", event);
      // });
      return { success: true, transaction };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : ERROR_MESSAGES.STAKING_FAILED;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsStaking(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  return {
    stake,
    isStaking,
    error,
    resetError,
  };
};
