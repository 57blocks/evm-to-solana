import { PublicKey, Connection } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { createStakingAccount } from "./account";
import { convertToLamports, convertFromLamports } from "./tokenUtils";
import { SolanaStaking } from "../idl/type";

export interface StakeTransactionParams {
  publicKey: PublicKey;
  program: Program<SolanaStaking>;
  stakeAmount: number;
}

export interface UnstakeTransactionParams {
  publicKey: PublicKey;
  program: Program<SolanaStaking>;
  unstakeAmount: number;
}

export interface ClaimRewardsParams {
  publicKey: PublicKey;
  program: Program<SolanaStaking>;
}

/**
 * Sleep utility for delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export interface StakeAccountInfo {
  statePda: PublicKey;
  userStakeInfoPda: PublicKey;
  blacklistPda: PublicKey;
  userTokenAccount: PublicKey;
  userRewardAccount: PublicKey;
  stakingVault: PublicKey;
  rewardVault: PublicKey;
}

/**
 * Create staking accounts and fetch state information
 */
export const createStakeAccountInfo = async (
  publicKey: PublicKey,
  program: Program<SolanaStaking>
): Promise<StakeAccountInfo> => {
  // Create staking accounts
  const {
    statePda,
    userStakeInfoPda,
    blacklistPda,
    userTokenAccount,
    userRewardAccount,
  } = await createStakingAccount(publicKey);

  // Fetch current state
  const state = await program.account.globalState.fetch(statePda);

  return {
    statePda,
    userStakeInfoPda,
    blacklistPda,
    userTokenAccount,
    userRewardAccount,
    stakingVault: state.stakingVault,
    rewardVault: state.rewardVault,
  };
};

/**
 * Execute a basic stake transaction using RPC
 */
export const executeStakeTransaction = async ({
  publicKey,
  program,
  stakeAmount,
}: StakeTransactionParams): Promise<string> => {
  const accountInfo = await createStakeAccountInfo(publicKey, program);

  const txSignature = await program.methods
    .stake(new BN(convertToLamports(stakeAmount).toString()))
    .accountsPartial({
      user: publicKey,
      state: accountInfo.statePda,
      userStakeInfo: accountInfo.userStakeInfoPda,
      userTokenAccount: accountInfo.userTokenAccount,
      userRewardAccount: accountInfo.userRewardAccount,
      blacklistEntry: accountInfo.blacklistPda,
    })
    .rpc();

  return txSignature;
};

/**
 * Create a stake instruction (for use in custom transactions)
 */
export const createStakeInstruction = async ({
  publicKey,
  program,
  stakeAmount,
}: StakeTransactionParams) => {
  const accountInfo = await createStakeAccountInfo(publicKey, program);

  const instruction = await program.methods
    .stake(new BN(convertToLamports(stakeAmount).toString()))
    .accountsPartial({
      user: publicKey,
      state: accountInfo.statePda,
      userStakeInfo: accountInfo.userStakeInfoPda,
      userTokenAccount: accountInfo.userTokenAccount,
      userRewardAccount: accountInfo.userRewardAccount,
      blacklistEntry: accountInfo.blacklistPda,
    })
    .instruction();

  return {
    instruction,
    accountInfo,
  };
};

/**
 * Send and confirm transaction with reliable confirmation
 * This method sends a serialized transaction and waits for confirmation
 */
export const sendAndConfirmTransaction = async (
  connection: Connection,
  serializedTransaction: Uint8Array,
  blockhashBuffer: number = 300
): Promise<string> => {
  const signature = await connection.sendRawTransaction(serializedTransaction);
  // Get current blockhash for confirmation
  const blockhashResponse = await connection.getLatestBlockhash();

  // Use a conservative buffer to avoid expiration
  const lastValidBlockHeight =
    blockhashResponse.lastValidBlockHeight + blockhashBuffer;
  await connection.confirmTransaction(
    {
      signature,
      blockhash: blockhashResponse.blockhash,
      lastValidBlockHeight: lastValidBlockHeight,
    },
    "confirmed"
  );
  return signature;
};

/**
 * User stake info type
 */
export interface UserStakeInfo {
  owner: PublicKey;
  amount: number;
  rewardDebt: number;
}

/**
 * Fetch user stake info from the program
 */
export const fetchUserStakeInfo = async (
  publicKey: PublicKey,
  program: Program<SolanaStaking>
): Promise<UserStakeInfo | null> => {
  try {
    const { userStakeInfoPda } = await createStakingAccount(publicKey);
    const userStakeInfo = await program.account.userStakeInfo.fetch(
      userStakeInfoPda
    );

    if (!userStakeInfo) {
      return null;
    }

    return {
      owner: userStakeInfo.owner,
      amount: convertFromLamports(userStakeInfo.amount ?? BigInt(0)),
      rewardDebt: convertFromLamports(userStakeInfo.rewardDebt ?? BigInt(0)),
    };
  } catch (error) {
    // Account doesn't exist or other error
    return null;
  }
};

/**
 * Execute unstake transaction using RPC
 */
export const executeUnstakeTransaction = async ({
  publicKey,
  program,
  unstakeAmount,
}: UnstakeTransactionParams): Promise<string> => {
  const accountInfo = await createStakeAccountInfo(publicKey, program);

  const txSignature = await program.methods
    .unstake(new BN(convertToLamports(unstakeAmount).toString()))
    .accountsPartial({
      user: publicKey,
      state: accountInfo.statePda,
      userStakeInfo: accountInfo.userStakeInfoPda,
      userTokenAccount: accountInfo.userTokenAccount,
      userRewardAccount: accountInfo.userRewardAccount,
      blacklistEntry: accountInfo.blacklistPda,
    })
    .rpc();

  return txSignature;
};

/**
 * Create unstake instruction (for use in custom transactions)
 */
export const createUnstakeInstruction = async ({
  publicKey,
  program,
  unstakeAmount,
}: UnstakeTransactionParams) => {
  const accountInfo = await createStakeAccountInfo(publicKey, program);

  const instruction = await program.methods
    .unstake(new BN(convertToLamports(unstakeAmount).toString()))
    .accountsPartial({
      user: publicKey,
      state: accountInfo.statePda,
      userStakeInfo: accountInfo.userStakeInfoPda,
      userTokenAccount: accountInfo.userTokenAccount,
      userRewardAccount: accountInfo.userRewardAccount,
      blacklistEntry: accountInfo.blacklistPda,
    })
    .instruction();

  return {
    instruction,
    accountInfo,
  };
};

/**
 * Execute claim rewards transaction using RPC
 */
export const executeClaimRewardsTransaction = async ({
  publicKey,
  program,
}: ClaimRewardsParams): Promise<string> => {
  const accountInfo = await createStakeAccountInfo(publicKey, program);

  const txSignature = await program.methods
    .claimRewards()
    .accountsPartial({
      user: publicKey,
      state: accountInfo.statePda,
      userStakeInfo: accountInfo.userStakeInfoPda,
      userRewardAccount: accountInfo.userRewardAccount,
      blacklistEntry: accountInfo.blacklistPda,
    })
    .rpc();

  return txSignature;
};

/**
 * Create claim rewards instruction (for use in custom transactions)
 */
export const createClaimRewardsInstruction = async ({
  publicKey,
  program,
}: ClaimRewardsParams) => {
  const accountInfo = await createStakeAccountInfo(publicKey, program);

  const instruction = await program.methods
    .claimRewards()
    .accountsPartial({
      user: publicKey,
      state: accountInfo.statePda,
      userStakeInfo: accountInfo.userStakeInfoPda,
      userRewardAccount: accountInfo.userRewardAccount,
      blacklistEntry: accountInfo.blacklistPda,
    })
    .instruction();

  return {
    instruction,
    accountInfo,
  };
};
