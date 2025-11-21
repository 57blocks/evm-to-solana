import { PublicKey, Connection } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createStakingAccount } from "./account";
import { convertToLamports } from "./tokenUtils";
import { SolanaStaking } from "../idl/type";

export interface StakeTransactionParams {
  publicKey: PublicKey;
  program: Program<SolanaStaking>;
  stakeAmount: number;
}

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
    .stake(new BN(convertToLamports(stakeAmount)))
    .accounts({
      user: publicKey,
      //@ts-ignore
      state: accountInfo.statePda,
      userStakeInfo: accountInfo.userStakeInfoPda,
      userTokenAccount: accountInfo.userTokenAccount,
      stakingVault: accountInfo.stakingVault,
      rewardVault: accountInfo.rewardVault,
      userRewardAccount: accountInfo.userRewardAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      blacklistEntry: accountInfo.blacklistPda,
      systemProgram: anchor.web3.SystemProgram.programId,
      clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
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
    .stake(new BN(convertToLamports(stakeAmount)))
    .accounts({
      user: publicKey,
      //@ts-ignore
      state: accountInfo.statePda,
      userStakeInfo: accountInfo.userStakeInfoPda,
      userTokenAccount: accountInfo.userTokenAccount,
      stakingVault: accountInfo.stakingVault,
      rewardVault: accountInfo.rewardVault,
      userRewardAccount: accountInfo.userRewardAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      blacklistEntry: accountInfo.blacklistPda,
      systemProgram: anchor.web3.SystemProgram.programId,
      clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
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
