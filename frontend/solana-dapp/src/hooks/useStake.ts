import { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { createStakingAccount } from "../utils/account";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { convertToLamports, ERROR_MESSAGES } from "@/utils/tokenUtils";

export interface UseStakeReturn {
  // State
  stakeAmount: string;
  isStaking: boolean;
  error: string | null;
  transactionSignature: string | null;

  // Actions
  setStakeAmount: (amount: string) => void;
  handleStake: () => Promise<void>;
  resetError: () => void;

  // Computed states
  isDisabled: boolean;
}

export const useStake = (
  onTransactionSuccess?: () => void,
  onError?: (message: string) => void
): UseStakeReturn => {
  const { publicKey } = useWallet();
  const { program } = useProgram();
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<
    string | null
  >(null);
  const stakeAmountRef = useRef("");

  const handleStake = async () => {
    if (!publicKey || !program) {
      const errorMsg = ERROR_MESSAGES.WALLET_NOT_CONNECTED;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      const errorMsg = ERROR_MESSAGES.INVALID_STAKE_AMOUNT;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (isStaking || isButtonClicked) {
      return;
    }

    // Immediately disable button to prevent multiple clicks
    setIsButtonClicked(true);
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

      const txSignature = await program.methods
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

      console.log("Staking transaction sent! Signature:", txSignature);

      // Wait for transaction confirmation before proceeding
      const connection = program.provider.connection;
      await connection.confirmTransaction(txSignature, "confirmed");

      console.log("Staking transaction confirmed! Signature:", txSignature);

      // Set transaction signature AFTER confirmation
      setTransactionSignature(txSignature);

      // Reset form and notify parent
      setStakeAmount("");
      stakeAmountRef.current = "";
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }

      // Reset transaction signature after success
      setTransactionSignature(null);
    } catch (err) {
      console.error("Staking failed:", err);
      const errorMessage =
        err instanceof Error ? err.message : ERROR_MESSAGES.STAKING_FAILED;
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsStaking(false);
      setIsButtonClicked(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  const isDisabled = !publicKey || isStaking || isButtonClicked;

  return {
    // State
    stakeAmount,
    isStaking,
    error,
    transactionSignature,

    // Actions
    setStakeAmount,
    handleStake,
    resetError,

    // Computed states
    isDisabled,
  };
};
