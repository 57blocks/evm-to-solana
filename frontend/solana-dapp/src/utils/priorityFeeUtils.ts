import { Connection, PublicKey, ComputeBudgetProgram, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
import { StakeAccountInfo } from "./stakingUtils";

export const DEFAULT_PRIORITY_FEE = 1;
export const DEFAULT_COMPUTE_UNITS = 200000;

export const filterValidFees = (fees: number[]): number[] => {
  return fees.filter((fee) => Number.isFinite(fee) && fee >= 0);
};

export const areAllFeesZero = (fees: number[]): boolean => {
  return fees.length === 0 || fees.every((fee) => fee === 0);
};

export const calculateRecommendedFee = (fees: number[]): number => {
  if (fees.length === 0) {
    return DEFAULT_PRIORITY_FEE;
  }

  const sorted = [...fees].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.75);
  const percentile = sorted[Math.min(idx, sorted.length - 1)];

  return Math.max(DEFAULT_PRIORITY_FEE, Math.ceil(percentile));
};

export const addSafetyMargin = (computeUnits: number, marginPercent: number = 0.1): number => {
  const safetyMargin = Math.ceil(computeUnits * marginPercent);
  return computeUnits + safetyMargin;
};

/**
 * Estimate compute units by simulating the transaction
 * @param connection - Solana connection
 * @param transaction - VersionedTransaction to simulate
 * @returns Estimated compute units with 10% safety margin
 */
export const estimateComputeUnits = async (
  connection: Connection,
  transaction: VersionedTransaction
): Promise<number> => {
  try {
    const simulation = await connection.simulateTransaction(transaction, {
      sigVerify: false,
      replaceRecentBlockhash: true,
    });

    if (simulation.value.err) {
      console.warn("Simulation failed:", simulation.value.err);
      return DEFAULT_COMPUTE_UNITS;
    }

    const estimatedCU = simulation.value.unitsConsumed || 0;

    if (estimatedCU === 0) {
      return DEFAULT_COMPUTE_UNITS;
    }

    // Add 10% safety margin
    return addSafetyMargin(estimatedCU, 0.1);
  } catch (error) {
    console.warn("Failed to estimate compute units:", error);
    return DEFAULT_COMPUTE_UNITS;
  }
};

/**
 * Fetch recent priority fees for given accounts
 */
export const getRecentPriorityFees = async (
  connection: Connection,
  publicKey: PublicKey,
  accountInfo: StakeAccountInfo
): Promise<number> => {
  try {
    const response = await connection.getRecentPrioritizationFees({
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
      return DEFAULT_PRIORITY_FEE;
    }

    const allFees = response.map((item) => item.prioritizationFee);
    const validFees = filterValidFees(allFees);

    if (areAllFeesZero(validFees)) {
      return DEFAULT_PRIORITY_FEE;
    }

    return calculateRecommendedFee(validFees);
  } catch (error) {
    console.warn("Failed to fetch priority fees:", error);
    return DEFAULT_PRIORITY_FEE;
  }
};

/**
 * Create compute unit limit instruction
 */
export const createComputeUnitLimitInstruction = (
  units: number
): TransactionInstruction => {
  return ComputeBudgetProgram.setComputeUnitLimit({ units });
};

/**
 * Create compute unit price instruction
 */
export const createComputeUnitPriceInstruction = (
  microLamports: number
): TransactionInstruction => {
  return ComputeBudgetProgram.setComputeUnitPrice({ microLamports });
};
