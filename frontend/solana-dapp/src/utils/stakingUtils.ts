import { PublicKey, Connection } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { createStakingAccount } from "./account";
import { convertToLamports, convertFromLamports } from "./tokenUtils";
import { SolanaStaking } from "../idl/solana_staking.ts";

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

/**
 * Sleep utility for delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export interface StakeAccountInfo {
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
 * Execute a basic stake transaction using RPC
 */
export const executeStakeTransaction = async ({
  publicKey,
  program,
  stakeAmount,
}: StakeTransactionParams): Promise<string> => {
  const accountInfo = await createStakingAccount(publicKey, program);

  const txSignature = await program.methods
    .stake(new BN(convertToLamports(stakeAmount).toString()))
    .accountsPartial({
      user: publicKey,
      userTokenAccount: accountInfo.userTokenAccount,
      userRewardAccount: accountInfo.userRewardAccount,
      poolConfig: accountInfo.poolConfig,
      poolState: accountInfo.poolState,
      userStakeInfo: accountInfo.userStakeInfo,
      stakingVault: accountInfo.stakingVault,
      rewardVault: accountInfo.rewardVault,
      blacklistEntry: accountInfo.blacklistEntry,
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
  const accountInfo = await createStakingAccount(publicKey, program);

  const instruction = await program.methods
    .stake(new BN(convertToLamports(stakeAmount).toString()))
    .accountsPartial({
      user: publicKey,
      ...accountInfo,
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
    const { userStakeInfoPda } = await createStakingAccount(publicKey, program);
    const userStakeInfo = await program.account.userStakeInfo.fetch(
      userStakeInfoPda
    );

    if (!userStakeInfo) {
      return null;
    }

    return {
      owner: publicKey,
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
  const accountInfo = await createStakingAccount(publicKey, program);

  const txSignature = await program.methods
    .unstake(new BN(convertToLamports(unstakeAmount).toString()))
    .accountsPartial({
      user: publicKey,
      ...accountInfo,
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
  const accountInfo = await createStakingAccount(publicKey, program);

  const instruction = await program.methods
    .unstake(new BN(convertToLamports(unstakeAmount).toString()))
    .accountsPartial({
      user: publicKey,
      ...accountInfo,
    })
    .instruction();

  return {
    instruction,
    accountInfo,
  };
};
