import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { ERROR_MESSAGES } from "@/utils/tokenUtils";
import { executeUnstakeTransaction } from "@/utils/stakingUtils";

export const useUnstake = () => {
  const { publicKey } = useWallet();
  const { program } = useProgram();

  const [isUnstaking, setIsUnstaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unstake = async (unstakeAmount: string) => {
    if (!publicKey || !program) {
      setError(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
      return;
    }

    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      setError(ERROR_MESSAGES.INVALID_UNSTAKE_AMOUNT);
      return;
    }
    setIsUnstaking(true);
    setError(null);

    try {
      const transaction = await executeUnstakeTransaction({
        publicKey,
        program,
        unstakeAmount: parseFloat(unstakeAmount),
      });
      return { success: true, transaction };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : ERROR_MESSAGES.UNSTAKING_FAILED;
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
