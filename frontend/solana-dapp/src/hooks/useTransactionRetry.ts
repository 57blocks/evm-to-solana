import { useCallback } from "react";
import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import {
  createStakeInstruction,
  sendAndConfirmTransaction,
} from "../utils/stakingUtils";
import { ERROR_MESSAGES } from "../utils/tokenUtils";

export const useTransactionRetry = () => {
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();
  const { connection } = useConnection();

  const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  const executeStakeTransaction = useCallback(
    async (
      stakeAmount: string,
      onError: (message: string) => void
    ): Promise<string | null> => {
      if (!publicKey || !program) {
        throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
      }

      if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
        throw new Error(ERROR_MESSAGES.INVALID_STAKE_AMOUNT);
      }

      // Execute real stake transaction with blockhash retry logic
      console.log("Executing stake transaction with blockhash retry logic...");

      // Get latest blockhash and set lastValidBlockHeight
      const blockhashResponse = await connection.getLatestBlockhash();
      const lastValidBlockHeight = blockhashResponse.lastValidBlockHeight - 150;

      // Create stake instruction using the common utility
      const { instruction: stakeInstruction } = await createStakeInstruction({
        publicKey,
        program,
        stakeAmount,
      });

      // Create transaction with blockhash and lastValidBlockHeight
      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash: blockhashResponse.blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
      }).add(stakeInstruction);

      // Sign transaction with wallet
      if (!signTransaction) {
        throw new Error("Wallet does not support signing transactions");
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
          console.log(
            "Transaction sent successfully, continuing retry loop..."
          );
        } catch (sendError) {
          // Ignore send errors, continue retrying
          console.log("Send error (expected):", sendError);
        }

        await sleep(500);
        blockHeight = await connection.getBlockHeight();
      }

      // Check if we had at least one successful send during the retry period
      if (!lastSuccessfulSend) {
        const errorMessage =
          "Transaction failed to send during the valid block height window. " +
          "Please try again with a new transaction.";

        onError(errorMessage);
        return null; // Return null to indicate failure
      }

      // Send and confirm final transaction
      const txSignature = await sendAndConfirmTransaction(
        connection,
        rawTransaction
      );

      console.log("Stake transaction successful! Signature:", txSignature);
      return txSignature;
    },
    [publicKey, program, signTransaction]
  );

  return {
    executeStakeTransaction,
  };
};
