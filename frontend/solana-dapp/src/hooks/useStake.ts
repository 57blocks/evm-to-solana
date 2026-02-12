import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { executeStakeTransaction } from "../utils/stakingUtils";
import { formatErrorForDisplay } from "@/utils/programErrors";
import { ErrorInfo } from "@/components/ErrorModal";
import { validateStakeParams } from "./useStakeValidation";

export interface UseStakeReturn {
  isStaking: boolean;
  transactionSignature: string | null;
  setStakeAmount: (value: number | undefined) => void;
  handleStake: () => Promise<void>;
  isDisabled: boolean;
  stakeAmount: number | undefined;
}

export type UseStakeOptions = {
  onSuccess: () => void;
  onError: (errorInfo: ErrorInfo) => void;
};

export const useStake = ({
  onSuccess,
  onError,
}: UseStakeOptions): UseStakeReturn => {
  const { publicKey } = useWallet();
  const { program } = useProgram();
  const [stakeAmount, setStakeAmount] = useState<number | undefined>(undefined);
  const [isStaking, setIsStaking] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);

  const handleStake = async () => {
    const { isValid } = validateStakeParams({
      publicKey,
      program,
      stakeAmount,
      onError,
    });
    if (!isValid) return;

    if (isStaking) return;

    setIsStaking(true);

    try {
      const txSignature = await executeStakeTransaction({
        publicKey: publicKey!,
        program: program!,
        stakeAmount: stakeAmount!,
      });
      setTransactionSignature(txSignature);
      setStakeAmount(undefined);
      onSuccess();
      setTransactionSignature(null);
    } catch (err) {
      const errorInfo = formatErrorForDisplay(err);
      onError(errorInfo);
    } finally {
      setIsStaking(false);
    }
  };

  const isDisabled = !publicKey || isStaking;

  return {
    stakeAmount,
    isStaking,
    transactionSignature,
    setStakeAmount,
    handleStake,
    isDisabled,
  };
};
