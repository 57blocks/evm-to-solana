import { useState } from "react";
import {
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { ComputeBudgetProgram } from "@solana/web3.js";
import { useProgram } from "./useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  createStakeInstruction,
  sendAndConfirmTransaction,
  StakeAccountInfo,
} from "../utils/stakingUtils";
import { ERROR_MESSAGES } from "../utils/tokenUtils";
import {
  DEFAULT_PRIORITY_FEE,
  DEFAULT_COMPUTE_UNITS,
  filterValidFees,
  calculateRecommendedFee,
  areAllFeesZero,
  addSafetyMargin,
} from "../utils/priorityFeeUtils";
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

  // Priority Fee configuration
  const [computeUnits, setComputeUnits] = useState(DEFAULT_COMPUTE_UNITS);
  const [computeUnitPrice, setComputeUnitPrice] = useState(1);

  /**
   * Set default priority fee when actual data is unavailable or invalid
   */
  const setDefaultPriorityFee = (): number => {
    setComputeUnitPrice(DEFAULT_PRIORITY_FEE);
    return DEFAULT_PRIORITY_FEE;
  };

  /**
   * Fetch and analyze recent priority fees for given accounts
   */
  const getRecentPriorityFees = async (
    accountInfo: StakeAccountInfo
  ): Promise<number> => {
    if (!program || !publicKey) {
      onError({ message: ERROR_MESSAGES.WALLET_NOT_CONNECTED });
      return DEFAULT_PRIORITY_FEE;
    }

    try {
      const response =
        await program.provider.connection.getRecentPrioritizationFees({
          lockedWritableAccounts: [
            publicKey,
            accountInfo.statePda,
            accountInfo.userStakeInfoPda,
            accountInfo.userTokenAccount,
            accountInfo.stakingVault,
            accountInfo.rewardVault,
            accountInfo.userRewardAccount,
            accountInfo.blacklistPda,
          ],
        });

      if (!response || response.length === 0) {
        return setDefaultPriorityFee();
      }

      const allFees = response.map((item) => item.prioritizationFee);
      console.log("Raw Priority Fees:", allFees.slice(0, 10));

      const validFees = filterValidFees(allFees);

      if (areAllFeesZero(validFees)) {
        return setDefaultPriorityFee();
      }

      const recommended = calculateRecommendedFee(validFees);
      setComputeUnitPrice(recommended);
      return recommended;
    } catch (err) {
      const errorInfo = formatErrorForDisplay(err);
      onError(errorInfo);
      return setDefaultPriorityFee();
    }
  };

  const createVersionedTransaction = async (
    instructions: TransactionInstruction[]
  ) => {
    if (!publicKey || !program) {
      onError({ message: ERROR_MESSAGES.WALLET_NOT_CONNECTED });
      return;
    }

    const { blockhash } =
      await program.provider.connection.getLatestBlockhash();

    const messageV0 = new TransactionMessage({
      payerKey: publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
  };

  // Estimate Compute Units for the stake transaction
  const estimateComputeUnits = async (): Promise<number> => {
    if (!publicKey || !program) {
      onError({ message: ERROR_MESSAGES.WALLET_NOT_CONNECTED });
      return DEFAULT_COMPUTE_UNITS;
    }

    try {
      console.log("Estimating Compute Units for stake transaction...");

      const result = await createStakeInstruction({
        publicKey,
        program,
        stakeAmount,
      });
      // Get recent priority fees for these accounts
      await getRecentPriorityFees(result.accountInfo);

      // Create VersionedTransaction for simulation
      const versionedTx = await createVersionedTransaction([
        result.instruction,
      ]);
      if (!versionedTx) {
        onError({ message: "Failed to create VersionedTransaction" });
        return DEFAULT_COMPUTE_UNITS;
      }
      // Simulate the VersionedTransaction to get compute units estimate
      const estimatedCU = versionedTx.message.compiledInstructions.length || 0;
      return addSafetyMargin(estimatedCU);
    } catch (err) {
      const errorInfo = formatErrorForDisplay(err);
      onError?.(errorInfo);
      // Fallback to default value
      setComputeUnits(DEFAULT_COMPUTE_UNITS);
      return DEFAULT_COMPUTE_UNITS;
    }
  };

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

    // First, estimate compute units
    const finalComputeUnits = await estimateComputeUnits();
    console.log("Compute Units estimated and set:", finalComputeUnits);

    // Create stake instruction
    const { instruction } = await createStakeInstruction({
      publicKey,
      program,
      stakeAmount,
    });
    // Build instructions array
    const instructions = [instruction];

    instructions.unshift(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: computeUnits,
      })
    );
    instructions.unshift(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: computeUnitPrice * 1000000, // Convert μSOL to microLamports
      })
    );

    // Create VersionedTransaction
    const versionedTx = await createVersionedTransaction(instructions);

    if (!signTransaction) {
      onError({ message: ERROR_MESSAGES.WALLET_NOT_SUPPORTED });
      return;
    }

    if (!versionedTx) {
      onError({ message: "Failed to create VersionedTransaction" });
      return;
    }
    const signedTx = await signTransaction(versionedTx);
    console.log("Sending and confirming Priority Fee transaction...");
    try {
      const signature = await sendAndConfirmTransaction(
        program?.provider.connection,
        signedTx.serialize()
      );
      onSuccess();
      return signature;
    } catch (error) {
      // Handle errors from sendAndConfirmTransaction
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Transaction confirmation failed";
      onError({
        message: errorMessage,
        title: "Transaction Failed",
      });
      return;
    }
  };

  return {
    handlePriorityStake,
  };
};
