import React, { useState, useEffect, useRef } from "react";
import styles from "../styles/StakingActions.module.css";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { STAKING_CONTRACT_ADDRESS, STAKING_TOKEN_ADDRESS } from "../../consts";
import { stakingAbi } from "../../abi/stakeAbi";
import { stakingTokenAbi } from "../../abi/StakingTokenABI";
import {
  convertToWei,
  validateTokenAmount,
  formatTokenAmount,
} from "../utils/tokenUtils";
import { useReadContract } from "wagmi";
import { Hash } from "viem";

interface StakeTokensProps {
  onStake: (amount: string) => void;
  isLoading?: boolean;
  onTransactionSuccess?: () => void;
  onError: (message: string) => void;
}

const StakeTokens: React.FC<StakeTokensProps> = ({
  onStake,
  isLoading = false,
  onTransactionSuccess,
  onError,
}) => {
  const [stakeAmount, setStakeAmount] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [approvalHash, setApprovalHash] = useState<Hash | null>(null);
  const [stakeTransactionHash, setStakeTransactionHash] = useState<Hash | null>(
    null
  );
  const stakeAmountRef = useRef("");
  const { isConnected, address } = useAccount();

  const {
    writeContract,
    data: writeData,
    error: writeError,
  } = useWriteContract();

  // Query current allowance
  const {
    data: currentAllowance,
    isLoading: isAllowanceLoading,
    refetch: refetchAllowance,
  } = useReadContract({
    address: STAKING_TOKEN_ADDRESS,
    abi: stakingTokenAbi,
    functionName: "allowance",
    args: [address, STAKING_CONTRACT_ADDRESS],
    query: {
      enabled: !!address && isConnected,
    },
  });

  const {
    isLoading: isStakingLoading,
    isSuccess: isStakingSuccess,
    error: isStakingError,
  } = useWaitForTransactionReceipt({
    hash: stakeTransactionHash as Hash | undefined,
  });

  // Handle approval transaction
  const {
    isLoading: isApprovalLoading,
    isSuccess: isApprovalSuccess,
    error: isApprovalError,
  } = useWaitForTransactionReceipt({
    hash: approvalHash as Hash | undefined,
  });

  // Track the current transaction type
  const [currentTransactionType, setCurrentTransactionType] = useState<
    "approve" | "stake" | null
  >(null);
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [isWaitingForWallet, setIsWaitingForWallet] = useState(false);

  // Set approval hash when writeContract data changes for approval
  useEffect(() => {
    if (writeData && currentTransactionType === "approve" && !approvalHash) {
      setApprovalHash(writeData as Hash);
      setIsWaitingForWallet(false); // Clear waiting state when we get the hash
    }
  }, [writeData, currentTransactionType, approvalHash]);

  // Set stake transaction hash when writeContract data changes for approval
  useEffect(() => {
    if (
      writeData &&
      currentTransactionType === "stake" &&
      !stakeTransactionHash
    ) {
      setStakeTransactionHash(writeData as Hash);
      setIsWaitingForWallet(false); // Clear waiting state when we get the hash
    }
  }, [writeData, currentTransactionType, stakeTransactionHash]);

  // Handle error messages
  useEffect(() => {
    if (writeError) {
      // Determine which transaction failed based on currentTransactionType
      if (currentTransactionType === "approve") {
        onError(
          `Approval failed: ${writeError.message || "Unknown error occurred"}`
        );
      } else if (currentTransactionType === "stake") {
        onError(
          `Staking failed: ${writeError.message || "Unknown error occurred"}`
        );
      } else {
        onError(
          `Transaction failed: ${
            writeError.message || "Unknown error occurred"
          }`
        );
      }
      setIsApproving(false);
      setCurrentTransactionType(null);
    }
  }, [writeError, currentTransactionType, onError]);

  // Handle transaction receipt errors
  useEffect(() => {
    if (isStakingError) {
      onError(
        `Staking transaction failed: ${
          isStakingError.message || "Transaction reverted"
        }`
      );
      setIsApproving(false);
      setCurrentTransactionType(null);
    } else if (isApprovalError) {
      onError(
        `Approval transaction failed: ${
          isApprovalError.message || "Transaction reverted"
        }`
      );
      setIsApproving(false);
      setCurrentTransactionType(null);
    }
  }, [isStakingError, isApprovalError, onError]);

  // Handle staking success
  useEffect(() => {
    if (isStakingSuccess) {
      console.log("Staking transaction successful!");
      setIsApproving(false);
      setCurrentTransactionType(null);
      setIsButtonClicked(false); // Re-enable button after success

      // Refresh allowance after successful staking
      refetchAllowance();

      // Call the onStake callback when staking is successful
      const currentStakeAmount = stakeAmountRef.current;
      if (currentStakeAmount) {
        onStake(currentStakeAmount);
        setStakeAmount("");
        stakeAmountRef.current = "";
        // Notify parent component to refresh stake information immediately after transaction success
        if (onTransactionSuccess) {
          onTransactionSuccess();
        }
      }
    }
  }, [isStakingSuccess, onStake, onTransactionSuccess, refetchAllowance]);

  // Handle approval success and auto-stake when allowance is sufficient
  useEffect(() => {
    if (isApprovalSuccess && isApproving && approvalHash) {
      // After approval is successful, refresh allowance and check if we can proceed with staking
      refetchAllowance();
      setCurrentTransactionType("stake");
      setIsApproving(false);
    }
  }, [isApprovalSuccess, isApproving, approvalHash, refetchAllowance]);

  // Auto-stake when allowance becomes sufficient after approval
  useEffect(() => {
    if (
      currentTransactionType === "stake" &&
      !isApproving &&
      !isStakingLoading &&
      approvalHash
    ) {
      const currentStakeAmount = stakeAmountRef.current;
      if (currentStakeAmount) {
        const stakeAmountWei = convertToWei(currentStakeAmount);

        // If allowance is sufficient, proceed with staking
        if (
          currentAllowance &&
          typeof currentAllowance === "bigint" &&
          currentAllowance >= stakeAmountWei
        ) {
          writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: stakingAbi,
            functionName: "stake",
            args: [stakeAmountWei],
          });
        }
      }
    }
  }, [
    currentTransactionType,
    isApproving,
    isStakingLoading,
    approvalHash,
    currentAllowance,
    writeContract,
  ]);

  // Clear error message when user starts a new action

  const handleStake = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (
      !stakeAmount ||
      isStakingLoading ||
      isLoading ||
      isApproving ||
      isApprovalLoading ||
      isAllowanceLoading ||
      isButtonClicked
    ) {
      return;
    }

    // Validate input using utility function
    const validation = validateTokenAmount(stakeAmount);
    if (!validation.isValid) {
      onError(validation.error || "Invalid amount");
      return;
    }

    // Immediately disable button to prevent multiple clicks
    setIsButtonClicked(true);

    // Convert to wei once
    const stakeAmountWei = convertToWei(stakeAmount);
    // Check if we need to approve first
    if (
      currentAllowance !== undefined &&
      typeof currentAllowance === "bigint" &&
      currentAllowance < stakeAmountWei
    ) {
      // Need to approve
      setIsApproving(true);
      setApprovalHash(null); // Clear any previous approval hash
      setCurrentTransactionType("approve");

      try {
        // Approve the staking contract to spend tokens
        writeContract({
          address: STAKING_TOKEN_ADDRESS,
          abi: stakingTokenAbi,
          functionName: "approve",
          args: [STAKING_CONTRACT_ADDRESS, stakeAmountWei],
        });
        // Set waiting state after initiating the transaction
        setIsWaitingForWallet(true);
      } catch (error) {
        onError(
          `Failed to approve tokens: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setIsApproving(false);
        setIsButtonClicked(false); // Re-enable button on error
      }
    } else {
      // Already have sufficient allowance, proceed directly to staking
      setCurrentTransactionType("stake");
      try {
        writeContract({
          address: STAKING_CONTRACT_ADDRESS,
          abi: stakingAbi,
          functionName: "stake",
          args: [stakeAmountWei],
        });
        // Set waiting state after initiating the transaction
        setIsWaitingForWallet(true);
      } catch (error) {
        onError(
          `Failed to initiate stake: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setIsButtonClicked(false); // Re-enable button on error
      }
    }
  };

  const isDisabled =
    !isConnected ||
    isStakingLoading ||
    isLoading ||
    isApproving ||
    isApprovalLoading ||
    isButtonClicked;

  return (
    <div>
      {/* Show current allowance if connected */}
      {isConnected && (
        <div className={styles.allowanceInfo}>
          {isAllowanceLoading ? (
            <p>Loading allowance... ⏳</p>
          ) : currentAllowance && typeof currentAllowance === "bigint" ? (
            <p>
              Current Allowance: {formatTokenAmount(currentAllowance)} tokens
            </p>
          ) : (
            <p>Allowance not available</p>
          )}
        </div>
      )}

      {/* Show approval success message */}
      {isApprovalSuccess && !isApproving && (
        <div className={styles.successMessage}>
          <p>
            ✅ Approval successful! Automatically proceeding with staking...
          </p>
        </div>
      )}

      {/* Show waiting for wallet confirmation message */}
      {isWaitingForWallet && currentTransactionType === "approve" && (
        <div className={styles.walletConfirmationMessage}>
          <p>
            ⏳ Waiting for wallet confirmation... Please check your wallet and
            confirm the approval transaction.
          </p>
        </div>
      )}

      {/* Show waiting for staking confirmation message */}
      {isWaitingForWallet && currentTransactionType === "stake" && (
        <div className={styles.walletConfirmationMessage}>
          <p>
            ⏳ Waiting for wallet confirmation... Please check your wallet and
            confirm the staking transaction.
          </p>
        </div>
      )}

      {/* Show waiting for allowance update message */}
      {currentTransactionType === "stake" &&
        !isApproving &&
        !isStakingLoading &&
        approvalHash && (
          <div className={styles.allowanceUpdateMessage}>
            <p>
              ⏳ Approval successful! Waiting for allowance to update on
              blockchain...
            </p>
          </div>
        )}

      <div className={styles.inputGroup}>
        <input
          type="number"
          min="0"
          step="1"
          value={stakeAmount}
          onChange={(e) => {
            const value = e.target.value;
            // Only allow positive integers or empty string
            if (
              value === "" ||
              (parseInt(value) >= 0 &&
                !value.includes(".") &&
                !value.includes(","))
            ) {
              setStakeAmount(value);
              stakeAmountRef.current = value;
            }
          }}
          placeholder={
            isConnected
              ? "Enter stake amount (1 = 1 token)"
              : "Connect wallet first"
          }
          className={styles.input}
          disabled={isDisabled}
        />
        <button
          onClick={handleStake}
          disabled={!stakeAmount || isDisabled || parseInt(stakeAmount) <= 0}
          className={`${styles.button} ${styles.stakeButton} ${
            isDisabled ? styles.disabledButton : ""
          } ${
            isApprovalLoading || isStakingLoading ? styles.loadingButton : ""
          }`}
        >
          {isApprovalLoading ? (
            <>
              <span className={styles.buttonSpinner}>⟳</span>
              Approving...
            </>
          ) : isStakingLoading ? (
            <>
              <span className={styles.buttonSpinner}>⟳</span>
              Staking...
            </>
          ) : (
            "Stake"
          )}
        </button>
      </div>
    </div>
  );
};

export default StakeTokens;
