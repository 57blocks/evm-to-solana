import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { createStakeInstruction, sendAndConfirmTransaction } from "../utils/stakingUtils";
import {
  DEFAULT_COMPUTE_UNITS,
  getRecentPriorityFees,
  addSafetyMargin,
  createComputeUnitLimitInstruction,
  createComputeUnitPriceInstruction,
} from "../utils/priorityFeeUtils";
import { createVersionedTransaction } from "../utils/lookupTableUtils";
import { formatErrorForDisplay } from "@/utils/programErrors";
import { ErrorInfo } from "@/components/ErrorModal";
import { validateStakeParams } from "./useStakeValidation";

export interface PriorityFeeReturn {
  handlePriorityStake: () => Promise<string | undefined>;
}

export type PriorityFeeOptions = {
  onSuccess: () => void;
  onError: (error: ErrorInfo) => void;
  stakeAmount: number;
};

export const usePriorityFee = ({
  onSuccess,
  onError,
  stakeAmount,
}: PriorityFeeOptions): PriorityFeeReturn => {
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();
  const { connection } = useConnection();

  const handlePriorityStake = async (): Promise<string | undefined> => {
    const { isValid } = validateStakeParams({
      publicKey,
      program,
      signTransaction,
      stakeAmount,
      onError,
    });
    if (!isValid) return;

    try {
      const { instruction, accountInfo } = await createStakeInstruction({
        publicKey: publicKey!,
        program: program!,
        stakeAmount,
      });

      const priorityFee = await getRecentPriorityFees(
        connection,
        publicKey!,
        accountInfo
      );

      const computeUnits = addSafetyMargin(DEFAULT_COMPUTE_UNITS);

      const instructions = [
        createComputeUnitPriceInstruction(priorityFee * 1000000),
        createComputeUnitLimitInstruction(computeUnits),
        instruction,
      ];

      const versionedTx = await createVersionedTransaction(
        connection,
        publicKey!,
        instructions
      );

      const signedTx = await signTransaction!(versionedTx);

      const signature = await sendAndConfirmTransaction(
        connection,
        signedTx.serialize()
      );

      onSuccess();
      return signature;
    } catch (error) {
      const errorInfo = formatErrorForDisplay(error);
      onError(errorInfo);
      return;
    }
  };

  return {
    handlePriorityStake,
  };
};
