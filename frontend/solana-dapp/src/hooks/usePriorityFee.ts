import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { createStakeInstruction, sendAndConfirmTransaction } from "../utils/stakingUtils";
import {
  getRecentPriorityFees,
  estimateComputeUnits,
  createComputeUnitLimitInstruction,
  createComputeUnitPriceInstruction,
} from "../utils/priorityFeeUtils";
import { createVersionedTransaction } from "../utils/lookupTableUtils";
import { formatErrorForDisplay } from "@/utils/programErrors";
import { ErrorInfo } from "@/components/ErrorModal";
import { validateStakeParams } from "./useStakeValidation";

export interface PriorityFeeReturn {
  handlePriorityStake: () => Promise<string | undefined>;
  isStaking: boolean;
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
  const [isStaking, setIsStaking] = useState(false);

  const handlePriorityStake = async (): Promise<string | undefined> => {
    const { isValid } = validateStakeParams({
      publicKey,
      program,
      signTransaction,
      stakeAmount,
      onError,
    });
    if (!isValid) return;

    setIsStaking(true);
    try {
      const { instruction, accountInfo } = await createStakeInstruction({
        publicKey: publicKey!,
        program: program!,
        stakeAmount,
      });

      // Step 1: Create a versioned transaction with just the stake instruction for simulation
      const simulationTx = await createVersionedTransaction(
        connection,
        publicKey!,
        [instruction]
      );

      // Step 2: Simulate to estimate compute units (adds 10% safety margin)
      const estimatedCU = await estimateComputeUnits(connection, simulationTx);

      // Step 3: Get priority fee based on recent network activity
      const priorityFee = await getRecentPriorityFees(
        connection,
        publicKey!,
        accountInfo
      );
      const instructions = [
        createComputeUnitPriceInstruction(priorityFee),
        createComputeUnitLimitInstruction(estimatedCU),
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
    } finally {
      setIsStaking(false);
    }
  };

  return {
    handlePriorityStake,
    isStaking,
  };
};
