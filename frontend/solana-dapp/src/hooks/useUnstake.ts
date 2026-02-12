import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { executeUnstakeTransaction } from "@/utils/stakingUtils";
import { formatErrorForDisplay } from "@/utils/programErrors";
import { ErrorInfo } from "@/components/ErrorModal";
import { validateStakeParams } from "./useStakeValidation";

export interface UseUnstakeReturn {
  unstake: (unstakeAmount: string) => Promise<string | undefined>;
  isUnstaking: boolean;
}

export type UseUnstakeOptions = {
  onSuccess: () => void;
  onError: (error: ErrorInfo) => void;
};

export const useUnstake = ({
  onSuccess,
  onError,
}: UseUnstakeOptions): UseUnstakeReturn => {
  const { publicKey } = useWallet();
  const { program } = useProgram();
  const [isUnstaking, setIsUnstaking] = useState(false);

  const unstake = async (unstakeAmount: string): Promise<string | undefined> => {
    const parsedAmount = parseFloat(unstakeAmount);
    const { isValid } = validateStakeParams({
      publicKey,
      program,
      unstakeAmount: parsedAmount,
      onError,
    });
    if (!isValid) return;

    setIsUnstaking(true);

    try {
      const signature = await executeUnstakeTransaction({
        publicKey: publicKey!,
        program: program!,
        unstakeAmount: parsedAmount,
      });
      onSuccess();
      return signature;
    } catch (err) {
      const errorInfo = formatErrorForDisplay(err);
      onError(errorInfo);
      return;
    } finally {
      setIsUnstaking(false);
    }
  };

  return {
    unstake,
    isUnstaking,
  };
};
