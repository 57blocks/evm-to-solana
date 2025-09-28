import { useState, useCallback } from "react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { ComputeBudgetProgram } from "@solana/web3.js";
import { useProgram } from "./useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  createStakeInstruction,
  sendAndConfirmTransaction,
} from "../utils/stakingUtils";
import { ERROR_MESSAGES } from "../utils/tokenUtils";

// Constants
const DEFAULT_PRIORITY_FEE = 10; // μSOL/CU for Devnet visibility
const DEFAULT_COMPUTE_UNITS = 200000;
const SAFETY_MARGIN_PERCENTAGE = 0.1; // 10%
const MAX_REASONABLE_PRIORITY_FEE = 1000; // μSOL/CU - cap for filtering unreasonable fees

export interface UsePriorityFeeReturn {
  // State
  computeUnits: number;
  computeUnitPrice: number;
  enablePriorityFee: boolean;
  estimatedComputeUnits: number | null;
  recommendedPriorityFee: number | null;
  priorityFeeHistory: number[];

  // Actions
  setEnablePriorityFee: (enabled: boolean) => void;
  estimateComputeUnits: (stakeAmount: string) => Promise<number>;
  getRecentPriorityFees: (accounts: PublicKey[]) => Promise<number>;
  handleStake: (stakeAmount: string) => Promise<string>;

  // Computed values
  totalFee: number; // in SOL
  priorityFeeAmount: number; // in SOL
}

export const usePriorityFee = (): UsePriorityFeeReturn => {
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();

  // Priority Fee configuration
  const [computeUnits, setComputeUnits] = useState(DEFAULT_COMPUTE_UNITS);
  const [computeUnitPrice, setComputeUnitPrice] = useState(1);
  const [enablePriorityFee, setEnablePriorityFee] = useState(true);
  const [estimatedComputeUnits, setEstimatedComputeUnits] = useState<
    number | null
  >(null);
  const [recommendedPriorityFee, setRecommendedPriorityFee] = useState<
    number | null
  >(null);
  const [priorityFeeHistory, setPriorityFeeHistory] = useState<number[]>([]);

  // Get recent priority fees for the accounts used in the transaction
  const getRecentPriorityFees = useCallback(
    async (accounts: PublicKey[]): Promise<number> => {
      if (!program) return 1;

      try {
        console.log("Fetching recent priority fees for accounts...");

        // Call getRecentPrioritizationFees with the accounts
        const response =
          await program.provider.connection.getRecentPrioritizationFees({
            lockedWritableAccounts: accounts,
          });

        if (response && response.length > 0) {
          // Extract priority fees and sort them
          const allFees = response.map((item) => item.prioritizationFee);
          console.log("Raw Priority Fees:", allFees.slice(0, 10)); // Log first 10 for debugging

          // Filter out unreasonable fees (likely errors) - cap at reasonable limit
          const fees = allFees
            .filter((fee) => fee >= 0 && fee <= MAX_REASONABLE_PRIORITY_FEE)
            .sort((a, b) => a - b);
          console.log("Filtered Priority Fees:", fees.slice(0, 10)); // Log first 10 for debugging

          // If all fees are 0, use a reasonable default fee for Devnet
          if (fees.length === 0 || fees.every((fee) => fee === 0)) {
            console.log(
              "All fees are 0 (typical for Devnet), using recommended default"
            );
            const recommended = DEFAULT_PRIORITY_FEE; // μSOL/CU for more visible effect in Devnet
            setPriorityFeeHistory([0, 1, 5, 10, 20]); // Show a range for context
            setRecommendedPriorityFee(recommended);
            setComputeUnitPrice(recommended);
            return recommended;
          }

          // Calculate recommended fee (75th percentile for safety)
          const percentile75 = Math.ceil(fees.length * 0.75);
          const recommended = fees[percentile75] || fees[fees.length - 1] || 1;

          console.log("Recommended Priority Fee:", recommended);

          setPriorityFeeHistory(fees);
          setRecommendedPriorityFee(recommended);
          setComputeUnitPrice(recommended);

          return recommended;
        }

        console.log("No priority fee data found, using default");
        setRecommendedPriorityFee(DEFAULT_PRIORITY_FEE);
        setComputeUnitPrice(DEFAULT_PRIORITY_FEE);
        return DEFAULT_PRIORITY_FEE;
      } catch (err) {
        console.error("Failed to get recent priority fees:", err);
        setRecommendedPriorityFee(DEFAULT_PRIORITY_FEE);
        setComputeUnitPrice(DEFAULT_PRIORITY_FEE);
        return DEFAULT_PRIORITY_FEE;
      }
    },
    [program]
  );

  // Create stake instruction wrapper for priority fee usage
  const createStakeInstructionWithAccounts = useCallback(
    async (stakeAmount: string) => {
      if (!publicKey || !program)
        throw new Error("Wallet or program not available");

      const { instruction, accountInfo } = await createStakeInstruction({
        publicKey,
        program,
        stakeAmount,
      });

      return {
        instruction,
        accounts: [
          publicKey,
          accountInfo.statePda,
          accountInfo.userStakeInfoPda,
          accountInfo.userTokenAccount,
          accountInfo.stakingVault,
          accountInfo.rewardVault,
          accountInfo.userRewardAccount,
          accountInfo.blacklistPda,
        ],
      };
    },
    [publicKey, program]
  );

  // Create VersionedTransaction (shared function)
  const createVersionedTransaction = useCallback(
    async (instructions: anchor.web3.TransactionInstruction[]) => {
      if (!publicKey || !program)
        throw new Error("Wallet or program not available");

      const { blockhash } =
        await program.provider.connection.getLatestBlockhash();

      const messageV0 = new anchor.web3.TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      return new VersionedTransaction(messageV0);
    },
    [publicKey, program]
  );

  // Estimate Compute Units for the stake transaction
  const estimateComputeUnits = useCallback(
    async (stakeAmount: string): Promise<number> => {
      if (!publicKey || !program) return DEFAULT_COMPUTE_UNITS;

      try {
        console.log("Estimating Compute Units for stake transaction...");

        const { instruction, accounts } =
          await createStakeInstructionWithAccounts(stakeAmount);

        // Get recent priority fees for these accounts
        await getRecentPriorityFees(accounts);

        // Create VersionedTransaction for simulation
        const versionedTx = await createVersionedTransaction([instruction]);

        // Simulate the VersionedTransaction to get compute units estimate
        const simulation =
          await program.provider.connection.simulateTransaction(versionedTx);

        if (simulation.value.err) {
          console.warn("Transaction simulation failed:", simulation.value.err);
          return DEFAULT_COMPUTE_UNITS;
        }

        const estimatedCU = simulation.value.unitsConsumed || 0;
        console.log("Estimated Compute Units:", estimatedCU);

        // Add 10% safety margin
        const safetyMargin = Math.ceil(estimatedCU * SAFETY_MARGIN_PERCENTAGE);
        const finalCU = estimatedCU + safetyMargin;

        console.log("Added 10% safety margin:", safetyMargin);
        console.log("Final Compute Units:", finalCU);

        setEstimatedComputeUnits(estimatedCU);
        setComputeUnits(finalCU);

        return finalCU;
      } catch (err) {
        console.error("Failed to estimate compute units:", err);
        // Fallback to default value
        setComputeUnits(DEFAULT_COMPUTE_UNITS);
        setEstimatedComputeUnits(null);
        return DEFAULT_COMPUTE_UNITS;
      }
    },
    [
      publicKey,
      program,
      createStakeInstructionWithAccounts,
      createVersionedTransaction,
      getRecentPriorityFees,
    ]
  );

  // Handle stake transaction with Priority Fee
  const handleStake = useCallback(
    async (stakeAmount: string): Promise<string> => {
      if (!publicKey || !program) {
        throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
      }

      if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
        throw new Error(ERROR_MESSAGES.INVALID_STAKE_AMOUNT);
      }

      console.log("Starting Priority Fee stake process...");

      // First, estimate compute units
      const finalComputeUnits = await estimateComputeUnits(stakeAmount);
      console.log("Compute Units estimated and set:", finalComputeUnits);

      // Create stake instruction
      const { instruction } = await createStakeInstructionWithAccounts(
        stakeAmount
      );

      // Build instructions array
      const instructions = [instruction];

      // Add Compute Budget instructions if Priority Fee is enabled
      if (enablePriorityFee) {
        console.log("Adding Priority Fee instructions:");
        console.log("   - Compute Units Limit:", computeUnits);
        console.log("   - Compute Unit Price:", computeUnitPrice, "μSOL/CU");
        console.log("   - MicroLamports per CU:", computeUnitPrice * 1000000);

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

        console.log("Priority Fee instructions added to transaction");
      } else {
        console.log("Priority Fee is disabled");
      }

      // Create VersionedTransaction
      const versionedTx = await createVersionedTransaction(instructions);

      if (!signTransaction) {
        throw new Error("Wallet does not support signing transactions");
      }

      console.log("Signing Priority Fee VersionedTransaction...");
      const signedTx = await signTransaction(versionedTx);

      console.log("Sending and confirming Priority Fee transaction...");
      const signature = await sendAndConfirmTransaction(
        program.provider.connection,
        signedTx.serialize()
      );

      console.log("Priority Fee stake transaction completed successfully!");
      return signature;
    },
    [
      publicKey,
      program,
      signTransaction,
      enablePriorityFee,
      computeUnits,
      computeUnitPrice,
      estimateComputeUnits,
      createStakeInstructionWithAccounts,
      createVersionedTransaction,
    ]
  );

  // Computed values
  const priorityFeeAmount = enablePriorityFee
    ? (computeUnitPrice * computeUnits) / 1000000
    : 0;
  const totalFee = 5000 / 1000000000 + priorityFeeAmount; // Base fee + priority fee

  return {
    // State
    computeUnits,
    computeUnitPrice,
    enablePriorityFee,
    estimatedComputeUnits,
    recommendedPriorityFee,
    priorityFeeHistory,

    // Actions
    setEnablePriorityFee,
    estimateComputeUnits,
    getRecentPriorityFees,
    handleStake,

    // Computed values
    totalFee,
    priorityFeeAmount,
  };
};
