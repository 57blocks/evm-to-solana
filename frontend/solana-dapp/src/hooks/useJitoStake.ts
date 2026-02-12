import { useState, useCallback } from "react";
import { Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { createStakeInstruction } from "../utils/stakingUtils";
import { ERROR_MESSAGES } from "../utils/tokenUtils";
import { formatErrorForDisplay } from "@/utils/programErrors";
import { ErrorInfo } from "@/components/ErrorModal";
import {
  calculateJitoFees,
  createPriorityFeeInstruction,
  createJitoTipInstruction,
  sendJitoTransaction,
  waitForConfirmation,
} from "@/utils/jitoUtils";

type UseJitoStakeOptions = {
  onSuccess: () => void;
  onError: (error: ErrorInfo) => void;
  stakeAmount: number;
};

/**
 * Hook for staking via Jito's sendTransaction endpoint
 * Uses 70/30 split: 70% priority fee + 30% Jito tip
 */
export const useJitoStake = ({
  onSuccess,
  onError,
  stakeAmount,
}: UseJitoStakeOptions) => {
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();
  const { connection } = useConnection();
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Execute stake transaction using Jito sendTransaction
   * Includes priority fee (70%) and Jito tip (30%) for optimal landing
   */
  const executeJitoStake = useCallback(async (): Promise<string | undefined> => {
    if (!publicKey || !program) {
      onError({ message: ERROR_MESSAGES.WALLET_NOT_CONNECTED });
      return;
    }

    if (!stakeAmount || stakeAmount <= 0) {
      onError({ message: ERROR_MESSAGES.INVALID_STAKE_AMOUNT });
      return;
    }

    if (!signTransaction) {
      onError({
        message: ERROR_MESSAGES.WALLET_NOT_SUPPORTED,
        title: "Wallet Not Supported",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Get latest blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      // 2. Calculate fees (70/30 split)
      const { priorityFee, jitoTip } = await calculateJitoFees();
      console.log(
        `Jito stake with priority fee: ${priorityFee} lamports, tip: ${jitoTip} lamports (${jitoTip / LAMPORTS_PER_SOL} SOL)`
      );

      // 3. Create stake instruction
      const { instruction: stakeInstruction } = await createStakeInstruction({
        publicKey,
        program,
        stakeAmount,
      });

      // 4. Create priority fee instruction
      const priorityFeeInstruction = createPriorityFeeInstruction(priorityFee);

      // 5. Create Jito tip instruction
      const tipInstruction = await createJitoTipInstruction(publicKey, jitoTip);

      // 6. Build transaction with all instructions
      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      })
        .add(priorityFeeInstruction) // Priority fee first
        .add(stakeInstruction) // Main instruction
        .add(tipInstruction); // Jito tip last

      // 7. Sign transaction
      const signedTx = await signTransaction(transaction);

      // 8. Send via Jito
      const signature = await sendJitoTransaction(signedTx);

      // 9. Wait for confirmation
      const confirmed = await waitForConfirmation(connection, signature);

      if (confirmed) {
        onSuccess();
        return signature;
      } else {
        throw new Error("Transaction confirmation timeout");
      }
    } catch (error) {
      const errorInfo = formatErrorForDisplay(error);
      onError(errorInfo);
      return;
    } finally {
      setIsSubmitting(false);
    }
  }, [publicKey, program, stakeAmount, signTransaction, connection, onSuccess, onError]);

  return {
    executeJitoStake,
    isSubmitting,
  };
};
