import { useState, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import {
  sendAndConfirmTransaction,
} from "../utils/stakingUtils";
import {
  createLookupTable,
  createVersionedStakeTransaction,
  AltAccountInfo,
} from "../utils/lookupTableUtils";
import { ERROR_MESSAGES } from "@/utils/tokenUtils";
import { AddressLookupTableAccount } from "@solana/web3.js";
import { formatErrorForDisplay } from "@/utils/programErrors";
import { ErrorInfo } from "@/components/ErrorModal";
import { UseStakeByAltReturn } from "@/types/lookupTable";
import { validateStakeParams } from "./useStakeValidation";
import { createStakingAccount } from "@/utils/account";

export type UseStakeByLookupTableOptions = {
  stakeAmount: number;
  onSuccess: () => void;
  onError: (error: ErrorInfo) => void;
};

export const useStakeByLookupTable = ({
  stakeAmount,
  onSuccess,
  onError,
}: UseStakeByLookupTableOptions): UseStakeByAltReturn => {
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();
  const { connection } = useConnection();
  const [isStaking, setIsStaking] = useState(false);
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
    const { isValid } = validateStakeParams({
      publicKey,
      program,
      signTransaction,
      stakeAmount,
      onError,
    });
    if (!isValid) return;

    if (isStaking) return;

    setIsStaking(true);

    try {
      const accountInfo = await createStakingAccount(publicKey!, program!);

      const lookupTable = await getOrCreateLookupTable(accountInfo);
      if (!lookupTable) {
        onError({ message: ERROR_MESSAGES.FAILED_TO_LOAD_LOOKUP_TABLE });
        return;
      }

      const versionedTx = await createVersionedStakeTransaction(
        connection,
        publicKey!,
        program!,
        stakeAmount,
        lookupTable
      );

      const signedVersionedTx = await signTransaction!(versionedTx);

      const signature = await sendAndConfirmTransaction(
        connection,
        signedVersionedTx.serialize()
      );

      setTransactionSignature(signature);
      onSuccess();
      setTransactionSignature(undefined);
    } catch (err) {
      const errorInfo = formatErrorForDisplay(err);
      onError(errorInfo);
    } finally {
      setIsStaking(false);
    }
  };

  const isDisabled = !publicKey || isStaking;

  return {
    isStaking,
    transactionSignature,
    handleStake,
    isDisabled,
  };
};
