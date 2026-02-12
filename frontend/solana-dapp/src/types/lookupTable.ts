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
 * Address Lookup Table (ALT) Hook Return Type
 */
export interface UseStakeByAltReturn {
  isStaking: boolean;
  transactionSignature?: string;
  handleStake: () => Promise<void>;
  isDisabled: boolean;
}
