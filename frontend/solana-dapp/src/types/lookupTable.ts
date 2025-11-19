import { AddressLookupTableAccount, PublicKey } from "@solana/web3.js";

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
 * Address Lookup Table (ALT) Hook Return Type
 */
export interface UseStakeByAltReturn {
  isStaking: boolean;
  isButtonClicked: boolean;
  transactionSignature?: string;
  lookupTableAddress?: PublicKey;
  handleStake: () => Promise<void>;
  isDisabled: boolean;
}

/**
 * Address Lookup Table (ALT) Hook Parameters
 */
export interface UseStakeByAltParams {
  onTransactionSuccess?: () => void;
  onError?: (message: string) => void;
}
