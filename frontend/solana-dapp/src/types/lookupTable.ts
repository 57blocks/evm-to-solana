import { PublicKey } from "@solana/web3.js";

/**
 * Address Lookup Table (ALT) Account Information
 * Matches the return type of createStakingAccount
 */
export interface AltAccountInfo {
  userStakeInfoPda: PublicKey;
  poolId: PublicKey;
  userTokenAccount: PublicKey;
  userRewardAccount: PublicKey;
  poolConfig: PublicKey;
  poolState: PublicKey;
  userStakeInfo: PublicKey;
  stakingVault: PublicKey;
  rewardVault: PublicKey;
  blacklistEntry: PublicKey;
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
