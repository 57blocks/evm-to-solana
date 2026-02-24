import {
  PublicKey,
  Connection,
  AddressLookupTableAccount,
  AddressLookupTableProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import { SolanaStaking } from "../idl/solana_staking.ts";
import { createStakeInstruction, sendAndConfirmTransaction } from "./stakingUtils";
import { AltAccountInfo } from "../types/lookupTable";

export type { AltAccountInfo };

/**
 * Create an Address Lookup Table (ALT) for stake accounts
 */
export const createLookupTable = async (
  connection: Connection,
  payer: PublicKey,
  accounts: AltAccountInfo,
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>
): Promise<AddressLookupTableAccount | null> => {
  const recentSlot = await connection.getSlot();

  // Create lookup table instruction
  const [lookupTableInst, lookupTableAddress] =
    AddressLookupTableProgram.createLookupTable({
      authority: payer,
      payer,
      recentSlot,
    });

  // Add accounts to lookup table instruction
  const addAccountsInst = AddressLookupTableProgram.extendLookupTable({
    payer: payer,
    authority: payer,
    lookupTable: lookupTableAddress,
    addresses: [
      accounts.poolConfig,
      accounts.poolState,
      accounts.userStakeInfo,
      accounts.userTokenAccount,
      accounts.stakingVault,
      accounts.rewardVault,
      accounts.userRewardAccount,
      accounts.blacklistEntry,
      TOKEN_PROGRAM_ID,
      SystemProgram.programId,
      SYSVAR_CLOCK_PUBKEY,
    ],
  });

  // Combine both instructions in a single transaction
  const combinedTx = new Transaction()
    .add(lookupTableInst)
    .add(addAccountsInst);

  combinedTx.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;
  combinedTx.feePayer = payer;

  const signedTx = await signTransaction(combinedTx);
  await sendAndConfirmTransaction(connection, signedTx.serialize());

  // Fetch the created lookup table
  const lookupTableResponse = await connection.getAddressLookupTable(
    lookupTableAddress
  );

  return lookupTableResponse.value;
};

/**
 * Create versioned transaction using Address Lookup Table (ALT)
 */
export const createVersionedTransaction = async (
  connection: Connection,
  payerKey: PublicKey,
  instructions: TransactionInstruction[],
  lookupTable?: AddressLookupTableAccount
): Promise<VersionedTransaction> => {
  const blockhash = (await connection.getLatestBlockhash()).blockhash;

  const messageV0 = new TransactionMessage({
    payerKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(lookupTable ? [lookupTable] : []);

  return new VersionedTransaction(messageV0);
};

/**
 * Create versioned stake transaction using Address Lookup Table (ALT)
 */
export const createVersionedStakeTransaction = async (
  connection: Connection,
  publicKey: PublicKey,
  program: Program<SolanaStaking>,
  stakeAmount: number,
  lookupTable: AddressLookupTableAccount
): Promise<VersionedTransaction> => {
  const { instruction: stakeInstruction } = await createStakeInstruction({
    publicKey,
    program,
    stakeAmount,
  });

  return createVersionedTransaction(
    connection,
    publicKey,
    [stakeInstruction],
    lookupTable
  );
};
