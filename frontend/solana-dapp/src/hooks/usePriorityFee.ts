import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import {
  createStakeInstruction,
  sendAndConfirmTransaction,
} from "../utils/stakingUtils";
import { ERROR_MESSAGES } from "../utils/tokenUtils";
import {
  DEFAULT_PRIORITY_FEE,
  DEFAULT_COMPUTE_UNITS,
  getRecentPriorityFees,
  addSafetyMargin,
  createComputeUnitLimitInstruction,
  createComputeUnitPriceInstruction,
} from "../utils/priorityFeeUtils";
import { createVersionedTransaction } from "../utils/lookupTableUtils";
import { formatErrorForDisplay } from "@/utils/programErrors";
import { ErrorInfo } from "@/components/ErrorModal";

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

  // Handle stake transaction with Priority Fee
  const handlePriorityStake = async (): Promise<string | undefined> => {
    if (!publicKey || !program) {
      onError?.({ message: ERROR_MESSAGES.WALLET_NOT_CONNECTED });
      return;
    }

    if (!stakeAmount) {
      onError?.({ message: ERROR_MESSAGES.INVALID_STAKE_AMOUNT });
      return;
    }

    if (!signTransaction) {
      onError({ message: ERROR_MESSAGES.WALLET_NOT_SUPPORTED });
      return;
    }

    try {
      // Create stake instruction and get account info
      const { instruction, accountInfo } = await createStakeInstruction({
        publicKey,
        program,
        stakeAmount,
      });

      // Get recent priority fees for these accounts
      const priorityFee = await getRecentPriorityFees(
        connection,
        publicKey,
        accountInfo
      );

      // Use default compute units with safety margin
      const computeUnits = addSafetyMargin(DEFAULT_COMPUTE_UNITS);

      // Build instructions array with priority fee instructions first
      const instructions = [
        createComputeUnitPriceInstruction(priorityFee * 1000000), // Convert to microLamports
        createComputeUnitLimitInstruction(computeUnits),
        instruction,
      ];

      // Create VersionedTransaction
      const versionedTx = await createVersionedTransaction(
        connection,
        publicKey,
        instructions
      );

      const signedTx = await signTransaction(versionedTx);

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
