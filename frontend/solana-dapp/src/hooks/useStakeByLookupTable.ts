import { useState, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import {
  createStakeAccountInfo,
  sendAndConfirmTransaction,
} from "../utils/stakingUtils";
import {
  createLookupTable,
  createVersionedStakeTransaction,
  AltAccountInfo,
} from "../utils/lookupTableUtils";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { ERROR_MESSAGES } from "@/utils/tokenUtils";
import { AddressLookupTableAccount } from "@solana/web3.js";
import { UseStakeByAltReturn } from "../types/lookupTable";
import { ErrorInfo } from "@/components/ErrorModal";
import { formatErrorForDisplay } from "@/utils/programErrors";

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
   * Get or create Address Lookup Table (ALT) with caching
   */
  const getOrCreateLookupTable = async (
    accounts: AltAccountInfo
  ): Promise<AddressLookupTableAccount | null> => {
    if (altCache.current) {
      return altCache.current;
    }

    if (!publicKey || !signTransaction) {
      return null;
    }

    const result = await createLookupTable(
      connection,
      publicKey,
      accounts,
      signTransaction
    );

    if (result) {
      altCache.current = result;
    }

    return result;
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

    if (!signTransaction) {
      onError?.({ message: ERROR_MESSAGES.WALLET_NOT_SUPPORTED });
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
      const lookupTable = await getOrCreateLookupTable(accounts);
      if (!lookupTable) {
        onError?.({ message: ERROR_MESSAGES.FAILED_TO_LOAD_LOOKUP_TABLE });
        return;
      }

      // Create versioned stake transaction using ALT
      const versionedTx = await createVersionedStakeTransaction(
        connection,
        publicKey,
        program,
        stakeAmount,
        lookupTable
      );

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
