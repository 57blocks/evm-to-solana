import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { ERROR_MESSAGES } from "@/utils/tokenUtils";
import { ErrorInfo } from "@/components/ErrorModal";
import { SolanaStaking } from "@/idl/solana_staking.ts";

export interface StakeValidationParams {
  publicKey: PublicKey | null;
  program: Program<SolanaStaking> | null | undefined;
  signTransaction?: <T extends Transaction | VersionedTransaction>(
    transaction: T
  ) => Promise<T>;
  stakeAmount?: number;
  unstakeAmount?: number;
  onError: (error: ErrorInfo) => void;
}

export interface ValidationResult {
  isValid: boolean;
}

/**
 * Validate common staking/unstaking prerequisites
 * Returns { isValid: true } if all validations pass
 * Calls onError and returns { isValid: false } if any validation fails
 */
export const validateStakeParams = ({
  publicKey,
  program,
  signTransaction,
  stakeAmount,
  unstakeAmount,
  onError,
}: StakeValidationParams): ValidationResult => {
  if (!publicKey || !program) {
    onError({ message: ERROR_MESSAGES.WALLET_NOT_CONNECTED });
    return { isValid: false };
  }

  if (stakeAmount !== undefined && (!stakeAmount || stakeAmount <= 0)) {
    onError({ message: ERROR_MESSAGES.INVALID_STAKE_AMOUNT });
    return { isValid: false };
  }

  if (unstakeAmount !== undefined && (!unstakeAmount || unstakeAmount <= 0)) {
    onError({ message: ERROR_MESSAGES.INVALID_UNSTAKE_AMOUNT });
    return { isValid: false };
  }

  if (signTransaction === null) {
    onError({ message: ERROR_MESSAGES.WALLET_NOT_SUPPORTED });
    return { isValid: false };
  }

  return { isValid: true };
};
