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
} from "@solana/web3.js";
import {
  AltAccountInfo,
  AltCreationParams,
  UseStakeByAltReturn,
  AltTransactionResult,
} from "../types/lookupTable";
import { useConnection } from "@solana/wallet-adapter-react";

export const useStakeByAlt = (
  onTransactionSuccess?: () => void,
  onError?: (message: string) => void
): UseStakeByAltReturn => {
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const { connection } = useConnection();
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<
    string | null
  >(null);
  const [lookupTableAddress, setLookupTableAddress] = useState<string | null>(
    null
  );
  const altCache = useRef<AddressLookupTableAccount | null>(null);

  /**
   * Create an Address Lookup Table (ALT) for stake accounts with optimized single transaction
   * Combines both create and extend instructions into one transaction
   */
  const createStakeAlt = async (
    params: AltCreationParams
  ): Promise<AltTransactionResult> => {
    console.log("Creating Address Lookup Table (ALT) for stake accounts...");
    const { payer, accounts } = params;

    const recentSlot = await connection.getSlot();

    // Create lookup table instruction
    const [lookupTableInst, altAddress] =
      AddressLookupTableProgram.createLookupTable({
        authority: payer,
        payer,
        recentSlot,
      });

    // Add accounts to lookup table instruction
    const addAccountsInst = AddressLookupTableProgram.extendLookupTable({
      payer: payer,
      authority: payer,
      lookupTable: altAddress,
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
    const combinedTx = new anchor.web3.Transaction()
      .add(lookupTableInst)
      .add(addAccountsInst);

    combinedTx.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    combinedTx.feePayer = payer;

    if (!signTransaction) {
      throw new Error("Wallet does not support signing transactions");
    }

    console.log("Signing combined Address Lookup Table (ALT) transaction...");
    const signedTx = await signTransaction(combinedTx);

    console.log("Sending and confirming transaction...");
    const signature = await sendAndConfirmTransaction(
      connection,
      signedTx.serialize()
    );

    console.log(
      "Address Lookup Table (ALT) created and accounts added:",
      altAddress.toString()
    );
    setLookupTableAddress(altAddress.toString());

    // Fetch the created lookup table
    const lookupTableResponse = await connection.getAddressLookupTable(
      altAddress
    );
    if (!lookupTableResponse.value) {
      throw new Error("Failed to fetch lookup table");
    }
    const lookupTableAccount = lookupTableResponse.value;

    altCache.current = lookupTableAccount;

    return {
      signature,
      lookupTableAddress: altAddress.toString(),
      lookupTableAccount,
    };
  };

  /**
   * Get or create Address Lookup Table (ALT) with caching
   */
  const getOrCreateAlt = async (
    payer: PublicKey,
    accounts: AltAccountInfo
  ): Promise<AddressLookupTableAccount> => {
    if (altCache.current) {
      console.log("Using cached Address Lookup Table (ALT)");
      return altCache.current;
    }

    const result = await createStakeAlt({
      payer,
      accounts,
    });

    return result.lookupTableAccount;
  };

  /**
   * Create versioned stake transaction using Address Lookup Table (ALT)
   * ALT optimizes transaction size by referencing accounts by index
   */
  const createVersionedStakeTransaction = async (
    publicKey: PublicKey,
    program: any,
    stakeAmount: string,
    alt: AddressLookupTableAccount
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
    }).compileToV0Message([alt]);

    return new VersionedTransaction(messageV0);
  };

  /**
   * Handle stake transaction using Address Lookup Table (ALT)
   */
  const handleStake = async () => {
    if (!publicKey || !program) {
      const errorMsg = ERROR_MESSAGES.WALLET_NOT_CONNECTED;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      const errorMsg = ERROR_MESSAGES.INVALID_STAKE_AMOUNT;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (isStaking || isButtonClicked) {
      return;
    }

    setIsButtonClicked(true);
    setIsStaking(true);
    setError(null);

    try {
      console.log("Starting Address Lookup Table (ALT) stake process...");

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
      const alt = await getOrCreateAlt(publicKey, accounts);

      // Create versioned stake transaction using ALT
      const versionedTx = await createVersionedStakeTransaction(
        publicKey,
        program,
        stakeAmount,
        alt
      );

      if (!signTransaction) {
        throw new Error("Wallet does not support signing transactions");
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
      // Don't clear stakeAmount when used in shared context
      // setStakeAmount("");
      // stakeAmountRef.current = "";

      if (onTransactionSuccess) {
        onTransactionSuccess();
      }

      setTransactionSignature(null);
    } catch (err) {
      console.error("Address Lookup Table (ALT) staking failed:", err);
      const errorMessage =
        err instanceof Error ? err.message : ERROR_MESSAGES.STAKING_FAILED;
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsStaking(false);
      setIsButtonClicked(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  const isDisabled = !publicKey || isStaking || isButtonClicked;

  return {
    stakeAmount,
    isStaking,
    isButtonClicked,
    error,
    transactionSignature,
    lookupTableAddress,
    setStakeAmount,
    handleStake,
    resetError,
    isDisabled,
  };
};
