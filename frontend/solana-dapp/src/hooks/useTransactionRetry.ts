import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import {
  createStakeInstruction,
  sendAndConfirmTransaction,
} from "../utils/stakingUtils";
import { ERROR_MESSAGES } from "../utils/tokenUtils";
import { ErrorInfo } from "@/components/ErrorModal";
type UseTransactionRetryOptions = {
  onSuccess: () => void;
  onError: (error: ErrorInfo) => void;
  stakeAmount: number;
};
export const useTransactionRetry = ({
  onSuccess,
  onError,
  stakeAmount,
}: UseTransactionRetryOptions) => {
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();
  const { connection } = useConnection();
  /**
   * Executes the stake transaction with blockhash retry logic.
   * Returns the transaction signature if successful, or undefined on error.
   */
  const executeStakeTransaction = async (): Promise<string | undefined> => {
    if (!publicKey || !program) {
      onError({
        message: ERROR_MESSAGES.WALLET_NOT_CONNECTED,
        title: "Wallet Not Connected",
      });
      return;
    }

    if (!stakeAmount || stakeAmount <= 0) {
      onError({
        message: ERROR_MESSAGES.INVALID_STAKE_AMOUNT,
        title: "Invalid Stake Amount",
      });
      return;
    }

    // Execute real stake transaction with blockhash retry logic
    console.log("Executing stake transaction with blockhash retry logic...");

    // Get latest blockhash and set lastValidBlockHeight
    const blockhashResponse = await connection.getLatestBlockhash();
    const lastValidBlockHeight = blockhashResponse.lastValidBlockHeight - 150;

    // Create stake instruction using the common utility
    const { instruction } = await createStakeInstruction({
      publicKey,
      program,
      stakeAmount,
    });

    // Create transaction with blockhash and lastValidBlockHeight
    const transaction = new Transaction({
      feePayer: publicKey,
      blockhash: blockhashResponse.blockhash,
      lastValidBlockHeight: lastValidBlockHeight,
    }).add(instruction);

    // Sign transaction with wallet
    if (!signTransaction) {
      onError({
        message: ERROR_MESSAGES.WALLET_NOT_SUPPORTED,
        title: "Wallet Not Supported",
      });
      return;
    }

    const signedTransaction = await signTransaction(transaction);
    const rawTransaction = signedTransaction.serialize();

    // Get current block height
    let blockHeight = await connection.getBlockHeight();
    let lastSuccessfulSend = false;

    // Keep sending transaction until block height exceeds lastValidBlockHeight
    while (blockHeight < lastValidBlockHeight) {
      try {
        await connection.sendRawTransaction(rawTransaction, {
          // skipPreflight: true is REQUIRED for retry logic
          // Reasons:
          // 1. We intentionally send the same transaction multiple times
          // 2. Preflight checks would fail on repeat sends with "Transaction already exists"
          // 3. During network congestion, transactions may be dropped and need resending
          // 4. We want to maximize chances of the transaction being accepted
          // 5. Final confirmation is handled separately with proper validation
          skipPreflight: true,
        });
        lastSuccessfulSend = true;
        console.log("Transaction sent successfully, continuing retry loop...");
      } catch (sendError) {
        // Ignore send errors, continue retrying
      }

      blockHeight = await connection.getBlockHeight();
    }

    // Check if we had at least one successful send during the retry period
    if (!lastSuccessfulSend) {
      onError({
        message:
          "Transaction failed to send during the valid block height window. Please try again with a new transaction.",
        title: "Transaction Failed",
      });
      return;
    }

    // Send and confirm final transaction
    const txSignature = await sendAndConfirmTransaction(
      connection,
      rawTransaction
    );

    onSuccess();
    return txSignature;
  };

  return {
    executeStakeTransaction,
  };
};
