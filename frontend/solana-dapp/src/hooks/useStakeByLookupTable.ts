import { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import {
  createStakeAccountInfo,
  createStakeInstruction,
  sendAndConfirmTransaction,
} from "../utils/stakingUtils";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { ERROR_MESSAGES } from "@/utils/tokenUtils";
import {
  PublicKey,
  AddressLookupTableAccount,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableProgram,
  Transaction,
} from "@solana/web3.js";
import { AltAccountInfo, UseStakeByAltReturn } from "../types/lookupTable";
import { useConnection } from "@solana/wallet-adapter-react";
import { ErrorInfo } from "@/components/ErrorModal";
import { formatErrorForDisplay } from "@/utils/programErrors";
import { Program } from "@coral-xyz/anchor";
import { SolanaStaking } from "@/idl/type";

export const useStakeByLookupTable = (
  stakeAmount: number,
  onSuccess: () => void,
  onError: (error: ErrorInfo) => void
): UseStakeByAltReturn => {
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();
  const [isStaking, setIsStaking] = useState(false);
  const { connection } = useConnection();
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState<string>();
  const altCache = useRef<AddressLookupTableAccount>();

  /**
   * Create an Address Lookup Table (ALT) for stake accounts with optimized single transaction
   * Combines both create and extend instructions into one transaction
   */
  const createLookupTable = async (
    payer: PublicKey,
    accounts: AltAccountInfo
  ): Promise<AddressLookupTableAccount | undefined> => {
    console.log("Creating Address Lookup Table (ALT) for stake accounts...");

    const recentSlot = await connection.getSlot();

    // Create lookup table instruction
    const [lookupTableInst, lookupTable] =
      AddressLookupTableProgram.createLookupTable({
        authority: payer,
        payer,
        recentSlot,
      });

    // Add accounts to lookup table instruction
    const addAccountsInst = AddressLookupTableProgram.extendLookupTable({
      payer: payer,
      authority: payer,
      lookupTable,
      addresses: [
        accounts.state,
        accounts.userStakeInfo,
        accounts.userTokenAccount,
        accounts.stakingVault,
        accounts.rewardVault,
        accounts.userRewardAccount,
        accounts.tokenProgram,
        accounts.blacklistEntry,
        accounts.systemProgram,
        accounts.clock,
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

    if (!signTransaction) {
      onError?.({ message: ERROR_MESSAGES.WALLET_NOT_SUPPORTED });
      return;
    }

    const signedTx = await signTransaction(combinedTx);
    await sendAndConfirmTransaction(connection, signedTx.serialize());
    // Fetch the created lookup table
    const lookupTableResponse = await connection.getAddressLookupTable(
      lookupTable
    );
    if (!lookupTableResponse.value) {
      onError?.({ message: ERROR_MESSAGES.FAILED_TO_LOAD_STAKE_INFO });
      return;
    }
    const lookupTableAccount = lookupTableResponse.value;

    altCache.current = lookupTableAccount;

    return lookupTableAccount;
  };

  /**
   * Get or create Address Lookup Table (ALT) with caching
   */
  const getOrCreateLookupTable = async (
    payer: PublicKey,
    accounts: AltAccountInfo
  ): Promise<AddressLookupTableAccount | undefined> => {
    if (altCache.current) {
      return altCache.current;
    }

    const result = await createLookupTable(payer, accounts);

    return result;
  };

  /**
   * Create versioned stake transaction using Address Lookup Table (ALT)
   * ALT optimizes transaction size by referencing accounts by index
   */
  const createVersionedStakeTransaction = async (
    publicKey: PublicKey,
    program: Program<SolanaStaking>,
    stakeAmount: number,
    lookupTable: AddressLookupTableAccount
  ): Promise<VersionedTransaction> => {
    // Use common utility to create stake instruction
    const { instruction: stakeInstruction } = await createStakeInstruction({
      publicKey,
      program,
      stakeAmount,
    });

    const blockhash = (await connection.getLatestBlockhash()).blockhash;

    const messageV0 = new TransactionMessage({
      payerKey: publicKey,
      recentBlockhash: blockhash,
      instructions: [stakeInstruction],
    }).compileToV0Message([lookupTable]);

    return new VersionedTransaction(messageV0);
  };

  /**
   * Handle stake transaction using Address Lookup Table (ALT)
   */
  const handleStake = async () => {
    if (!publicKey || !program) {
      onError?.({ message: ERROR_MESSAGES.WALLET_NOT_CONNECTED });
      return;
    }

    if (!stakeAmount || stakeAmount <= 0) {
      onError?.({ message: ERROR_MESSAGES.INVALID_STAKE_AMOUNT });
      return;
    }

    if (isStaking || isButtonClicked) {
      onError?.({ message: "Already staking or button clicked, skipping..." });
      return;
    }

    setIsButtonClicked(true);
    setIsStaking(true);

    try {
      // Create staking accounts using common utility
      const accountInfo = await createStakeAccountInfo(publicKey, program);

      const accounts: AltAccountInfo = {
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
      };

      // Get or create Address Lookup Table (ALT)
      const lookupTable = await getOrCreateLookupTable(publicKey, accounts);
      if (!lookupTable) {
        onError?.({ message: ERROR_MESSAGES.FAILED_TO_LOAD_LOOKUP_TABLE });
        return;
      }
      // Create versioned stake transaction using ALT
      const versionedTx = await createVersionedStakeTransaction(
        publicKey,
        program,
        stakeAmount,
        lookupTable
      );

      if (!signTransaction) {
        onError?.({ message: ERROR_MESSAGES.WALLET_NOT_SUPPORTED });
        return;
      }

      const signedVersionedTx = await signTransaction(versionedTx);

      const signature = await sendAndConfirmTransaction(
        connection,
        signedVersionedTx.serialize()
      );

      console.log(
        "Address Lookup Table (ALT) stake successful! Signature:",
        signature
      );
      setTransactionSignature(signature);
      onSuccess();

      setTransactionSignature(undefined);
    } catch (err) {
      const errorInfo = formatErrorForDisplay(err);
      onError({ message: errorInfo.message, title: errorInfo.title });
    } finally {
      setIsStaking(false);
      setIsButtonClicked(false);
    }
  };

  const isDisabled = !publicKey || isStaking || isButtonClicked;

  return {
    isStaking,
    isButtonClicked,
    transactionSignature,
    handleStake,
    isDisabled,
  };
};
