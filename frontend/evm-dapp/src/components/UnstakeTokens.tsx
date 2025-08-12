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
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [isWaitingForWallet, setIsWaitingForWallet] = useState(false);
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

  // Clear waiting state when we get the transaction hash
  useEffect(() => {
    if (unstakeHash) {
      setIsWaitingForWallet(false);
    }
  }, [unstakeHash]);

  // Handle error messages
  useEffect(() => {
    if (writeError) {
      onError(
        `Transaction failed: ${writeError.message || "Unknown error occurred"}`
      );
      setIsButtonClicked(false); // Re-enable button on write error
    } else if (isUnstakingError) {
      onError(
        `Unstaking failed: ${
          isUnstakingError.message || "Transaction reverted"
        }`
      );
      setIsButtonClicked(false); // Re-enable button on transaction error
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
        setIsButtonClicked(false); // Re-enable button after success
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

    if (!unstakeAmount || isUnstakingLoading || isLoading || isButtonClicked) {
      return;
    }

    // Validate input using utility function
    const validation = validateTokenAmount(unstakeAmount);
    if (!validation.isValid) {
      onError(validation.error || "Invalid amount");
      return;
    }

    // Immediately disable button to prevent multiple clicks
    setIsButtonClicked(true);

    try {
      const unstakeAmountWei = convertToWei(unstakeAmount);
      writeContract({
        address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
        abi: stakingAbi,
        functionName: "unstake",
        args: [unstakeAmountWei],
      });
      // Set waiting state after initiating the transaction
      setIsWaitingForWallet(true);
    } catch (error) {
      onError(
        `Failed to initiate unstake: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setIsButtonClicked(false); // Re-enable button on error
    }
  };

  const isDisabled =
    !isConnected || isUnstakingLoading || isLoading || isButtonClicked;

  return (
    <div>
      {/* Show waiting for wallet confirmation message */}
      {isWaitingForWallet && (
        <div className={styles.walletConfirmationMessage}>
          <p>
            ⏳ Waiting for wallet confirmation... Please check your wallet and
            confirm the unstaking transaction.
          </p>
        </div>
      )}

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
          } ${isUnstakingLoading ? styles.loadingButton : ""}`}
        >
          {isUnstakingLoading ? (
            <>
              <span className={styles.buttonSpinner}>⟳</span>
              Processing...
            </>
          ) : (
            "Unstake"
          )}
        </button>
      </div>
    </div>
  );
};

export default UnstakeTokens;
