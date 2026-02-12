import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { createStakeInstruction, sleep } from "../utils/stakingUtils";
import { ErrorInfo } from "@/components/ErrorModal";
import { validateStakeParams } from "./useStakeValidation";

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
  const executeStakeWithRetry = async (): Promise<string | undefined> => {
    const { isValid } = validateStakeParams({
      publicKey,
      program,
      signTransaction,
      stakeAmount,
      onError,
    });
    if (!isValid) return;

    // Get latest blockhash and set lastValidBlockHeight
    const blockhashResponse = await connection.getLatestBlockhash();
    // Subtract a small safety buffer to ensure we stop retrying
    // before the transaction actually expires, avoiding failures near expiration
    const SAFETY_BUFFER = 100; // blocks
    const lastValidBlockHeight =
      blockhashResponse.lastValidBlockHeight - SAFETY_BUFFER;

    // Create stake instruction using the common utility
    const { instruction } = await createStakeInstruction({
      publicKey: publicKey!,
      program: program!,
      stakeAmount,
    });

    // Create transaction with blockhash and lastValidBlockHeight
    const transaction = new Transaction({
      feePayer: publicKey,
      blockhash: blockhashResponse.blockhash,
      lastValidBlockHeight: lastValidBlockHeight,
    }).add(instruction);

    const signedTransaction = await signTransaction!(transaction);
    const rawTransaction = signedTransaction.serialize();

    // Get current block height
    let blockHeight = await connection.getBlockHeight();
    let confirmedSignature: string | undefined;

    // Keep sending transaction until block height exceeds lastValidBlockHeight
    while (blockHeight < lastValidBlockHeight) {
      try {
        const signature = await connection.sendRawTransaction(rawTransaction, {
          // skipPreflight: true is REQUIRED for retry logic
          // Reasons:
          // 1. We intentionally send the same transaction multiple times
          // 2. Preflight checks would fail on repeat sends with "Transaction already exists"
          // 3. During network congestion, transactions may be dropped and need resending
          // 4. We want to maximize chances of the transaction being accepted
          // 5. Final confirmation is handled separately with proper validation
          skipPreflight: true,
        });
        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash: blockhashResponse.blockhash,
            lastValidBlockHeight: lastValidBlockHeight,
          },
          "confirmed"
        );
        if (!confirmation.value.err) {
          confirmedSignature = signature;
          onSuccess();
          break;
        }
        await sleep(500);
        blockHeight = await connection.getBlockHeight();
      } catch (error) {
        // Ignore send errors, continue retrying
        await sleep(500);
        blockHeight = await connection.getBlockHeight();
      }
    }

    // Check if we had a successful confirmation
    if (!confirmedSignature) {
      onError({
        message:
          "Transaction failed to send during the valid block height window. Please try again with a new transaction.",
        title: "Transaction Failed",
      });
      return;
    }

    return confirmedSignature;
  };

  return { executeStakeWithRetry };
};
