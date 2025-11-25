import { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { executeStakeTransaction } from "../utils/stakingUtils";
import { ERROR_MESSAGES } from "@/utils/tokenUtils";
import { formatErrorForDisplay } from "@/utils/programErrors";
import { ErrorInfo } from "@/components/ErrorModal";

export interface UseStakeReturn {
  // State
  isStaking: boolean;
  transactionSignature: string | null;

  // Actions
  setStakeAmount: (value: number | undefined) => void;
  handleStake: () => Promise<void>;

  // Computed states
  isDisabled: boolean;
  stakeAmount: number | undefined;
}

export const useStake = (
  onSuccess: () => void,
  onError: (errorInfo: ErrorInfo) => void
): UseStakeReturn => {
  const { publicKey } = useWallet();
  const { program } = useProgram();
  const [stakeAmount, setStakeAmount] = useState<number | undefined>(undefined);
  const [isStaking, setIsStaking] = useState(false);
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState<
    string | null
  >(null);
  const stakeAmountRef = useRef("");

  const handleStake = async () => {
    if (!publicKey || !program) {
      const errorMsg = ERROR_MESSAGES.WALLET_NOT_CONNECTED;
      onError?.({ message: errorMsg });
      return;
    }

    if (!stakeAmount || stakeAmount <= 0) {
      const errorMsg = ERROR_MESSAGES.INVALID_STAKE_AMOUNT;
      onError?.({ message: errorMsg });
      return;
    }

    if (isStaking || isButtonClicked) {
      return;
    }

    // Immediately disable button to prevent multiple clicks
    setIsButtonClicked(true);
    setIsStaking(true);

    try {
      const txSignature = await executeStakeTransaction({
        publicKey,
        program,
        stakeAmount,
      });
      // Set transaction signature AFTER confirmation
      setTransactionSignature(txSignature);
      // Reset form and notify parent
      setStakeAmount(undefined);
      stakeAmountRef.current = "";
      onSuccess && onSuccess();

      // Reset transaction signature after success
      setTransactionSignature(null);
    } catch (err) {
      const errorMessage = formatErrorForDisplay(err);
      onError?.({ message: errorMessage.message, title: errorMessage.title });
    } finally {
      setIsStaking(false);
      setIsButtonClicked(false);
    }
  };

  const isDisabled = !publicKey || isStaking || isButtonClicked;

  return {
    // State
    stakeAmount,
    isStaking,
    transactionSignature,

    // Actions
    setStakeAmount,
    handleStake,

    // Computed states
    isDisabled,
  };
};
