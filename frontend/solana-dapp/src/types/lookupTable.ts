import { PublicKey } from "@solana/web3.js";

/**
 * Address Lookup Table (ALT) Account Information
 */
export interface AltAccountInfo {
  state: PublicKey;
  userStakeInfo: PublicKey;
  userTokenAccount: PublicKey;
  stakingVault: PublicKey;
  rewardVault: PublicKey;
  userRewardAccount: PublicKey;
  tokenProgram: PublicKey;
  blacklistEntry: PublicKey;
  systemProgram: PublicKey;
  clock: PublicKey;
}

/**
 * Address Lookup Table (ALT) Creation Parameters
 */
export interface AltCreationParams {
  payer: PublicKey;
  accounts: AltAccountInfo;
}

/**
 * Address Lookup Table (ALT) Hook Return Type
 */
export interface UseStakeByAltReturn {
  stakeAmount: string;
  isStaking: boolean;
  isButtonClicked: boolean;
  error: string | null;
  transactionSignature: string | null;
  lookupTableAddress: string | null;
  setStakeAmount: (amount: string) => void;
  handleStake: () => Promise<void>;
  resetError: () => void;
  isDisabled: boolean;
}

/**
 * Address Lookup Table (ALT) Hook Parameters
 */
export interface UseStakeByAltParams {
  onTransactionSuccess?: () => void;
  onError?: (message: string) => void;
}

/**
 * Address Lookup Table (ALT) Transaction Result
 */
export interface AltTransactionResult {
  signature: string;
  lookupTableAddress: string;
  lookupTableAccount: any; // AddressLookupTableAccount type
}

/**
 * Address Lookup Table (ALT) Error Types
 */
export enum AltErrorType {
  WALLET_NOT_CONNECTED = "WALLET_NOT_CONNECTED",
  INVALID_STAKE_AMOUNT = "INVALID_STAKE_AMOUNT",
  ALT_CREATION_FAILED = "ALT_CREATION_FAILED",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  SIGNING_FAILED = "SIGNING_FAILED",
}

/**
 * Address Lookup Table (ALT) Process Steps
 */
export enum AltProcessStep {
  CREATING_TABLE = "CREATING_TABLE",
  ADDING_ACCOUNTS = "ADDING_ACCOUNTS",
  SENDING_TRANSACTION = "SENDING_TRANSACTION",
  COMPLETED = "COMPLETED",
}
