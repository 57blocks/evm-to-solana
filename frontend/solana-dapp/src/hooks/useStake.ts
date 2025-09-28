import { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { executeStakeTransaction } from "../utils/stakingUtils";
import { ERROR_MESSAGES } from "@/utils/tokenUtils";

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
      console.log("Executing stake transaction", stakeAmount);

      const txSignature = await executeStakeTransaction({
        publicKey,
        program,
        stakeAmount,
      });

      console.log("Staking transaction sent! Signature:", txSignature);

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
