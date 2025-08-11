import React, { useState, useEffect, useRef } from "react";
import styles from "../styles/StakingActions.module.css";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { STAKING_CONTRACT_ADDRESS } from "../../consts";
import { stakingAbi } from "../../abi/stakeAbi";
import { convertToWei, validateTokenAmount } from "../utils/tokenUtils";

interface UnstakeTokensProps {
  onUnstake: (amount: string) => void;
  isLoading?: boolean;
  onTransactionSuccess?: () => void;
  onError: (message: string) => void;
}

const UnstakeTokens: React.FC<UnstakeTokensProps> = ({
  onUnstake,
  isLoading = false,
  onTransactionSuccess,
  onError,
}) => {
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const unstakeAmountRef = useRef("");
  const { isConnected } = useAccount();

  const {
    writeContract,
    data: unstakeHash,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isUnstakingLoading,
    isSuccess: isUnstakingSuccess,
    error: isUnstakingError,
  } = useWaitForTransactionReceipt({
    hash: unstakeHash,
  });

  // Handle error messages
  useEffect(() => {
    if (writeError) {
      onError(
        `Transaction failed: ${writeError.message || "Unknown error occurred"}`
      );
    } else if (isUnstakingError) {
      onError(
        `Unstaking failed: ${
          isUnstakingError.message || "Transaction reverted"
        }`
      );
    }
  }, [writeError, isUnstakingError, onError]);

  // Handle unstaking success separately
  useEffect(() => {
    if (isUnstakingSuccess) {
      // Call the onUnstake callback when unstaking is successful
      const currentUnstakeAmount = unstakeAmountRef.current;
      if (currentUnstakeAmount) {
        onUnstake(currentUnstakeAmount);
        setUnstakeAmount("");
        unstakeAmountRef.current = "";
        // Notify parent component to refresh stake information immediately after transaction success
        if (onTransactionSuccess) {
          onTransactionSuccess();
        }
      }
    }
  }, [isUnstakingSuccess, onUnstake, onTransactionSuccess]);

  const handleUnstake = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!unstakeAmount || isUnstakingLoading || isLoading) {
      return;
    }

    // Validate input using utility function
    const validation = validateTokenAmount(unstakeAmount);
    if (!validation.isValid) {
      onError(validation.error || "Invalid amount");
      return;
    }

    try {
      const unstakeAmountWei = convertToWei(unstakeAmount);
      writeContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: stakingAbi,
        functionName: "unstake",
        args: [unstakeAmountWei],
      });
    } catch (error) {
      onError(
        `Failed to initiate unstake: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const isDisabled = !isConnected || isUnstakingLoading || isLoading;

  return (
    <div>
      <div className={styles.inputGroup}>
        <input
          type="number"
          min="0"
          step="1"
          value={unstakeAmount}
          onChange={(e) => {
            const value = e.target.value;
            // Only allow positive integers or empty string
            if (
              value === "" ||
              (parseInt(value) >= 0 &&
                !value.includes(".") &&
                !value.includes(","))
            ) {
              setUnstakeAmount(value);
              unstakeAmountRef.current = value;
            }
          }}
          placeholder={
            isConnected
              ? "Enter unstake amount (1 = 1 token)"
              : "Connect wallet first"
          }
          className={styles.input}
          disabled={isDisabled}
        />
        <button
          onClick={handleUnstake}
          disabled={
            !unstakeAmount || isDisabled || parseInt(unstakeAmount) <= 0
          }
          className={`${styles.button} ${styles.unstakeButton} ${
            isDisabled ? styles.disabledButton : ""
          }`}
        >
          {isUnstakingLoading ? "Processing..." : "Unstake"}
        </button>
      </div>
    </div>
  );
};

export default UnstakeTokens;
