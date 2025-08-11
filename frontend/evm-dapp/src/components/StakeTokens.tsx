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
  const [approvalHash, setApprovalHash] = useState<string | null>(null);
  const [stakeTransactionHash, setStakeTransactionHash] = useState<
    string | null
  >(null);
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

  // Set approval hash when writeContract data changes for approval
  useEffect(() => {
    if (writeData && currentTransactionType === "approve" && !approvalHash) {
      console.log("Setting approval hash:", writeData);
      setApprovalHash(writeData);
    }
  }, [writeData, currentTransactionType, approvalHash]);

  // Set stake transaction hash when writeContract data changes for staking
  useEffect(() => {
    if (
      writeData &&
      currentTransactionType === "stake" &&
      !stakeTransactionHash
    ) {
      console.log("Setting stake transaction hash:", writeData);
      setStakeTransactionHash(writeData);
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

  // Debug: Monitor stake transaction state changes
  useEffect(() => {
    if (stakeTransactionHash) {
      console.log("Stake transaction state:", {
        hash: stakeTransactionHash,
        isLoading: isStakingLoading,
        isSuccess: isStakingSuccess,
        error: isStakingError,
      });
    }
  }, [
    stakeTransactionHash,
    isStakingLoading,
    isStakingSuccess,
    isStakingError,
  ]);

  // Handle approval success
  useEffect(() => {
    if (isApprovalSuccess && isApproving) {
      // After approval is successful, refresh allowance and automatically proceed with staking
      refetchAllowance();
      setCurrentTransactionType("stake");
      setIsApproving(false);

      // Wait a bit for allowance to be updated, then automatically stake
      setTimeout(() => {
        if (stakeAmount && !isStakingLoading) {
          const stakeAmountWei = convertToWei(stakeAmount);
          writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: stakingAbi,
            functionName: "stake",
            args: [stakeAmountWei],
          });
        }
      }, 2000); // Wait 2 seconds for allowance to be updated
    }
  }, [
    isApprovalSuccess,
    isApproving,
    refetchAllowance,
    stakeAmount,
    isStakingLoading,
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
      isAllowanceLoading
    ) {
      return;
    }

    // Validate input using utility function
    const validation = validateTokenAmount(stakeAmount);
    if (!validation.isValid) {
      onError(validation.error || "Invalid amount");
      return;
    }

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
      } catch (error) {
        onError(
          `Failed to approve tokens: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setIsApproving(false);
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
      } catch (error) {
        onError(
          `Failed to initiate stake: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  };

  const isDisabled =
    !isConnected ||
    isStakingLoading ||
    isLoading ||
    isApproving ||
    isApprovalLoading;

  return (
    <div>
      {/* Show current allowance if connected */}
      {isConnected &&
      currentAllowance &&
      typeof currentAllowance === "bigint" ? (
        <div className={styles.allowanceInfo}>
          <p>Current Allowance: {formatTokenAmount(currentAllowance)} tokens</p>
        </div>
      ) : null}

      {/* Show approval success message */}
      {isApprovalSuccess && !isApproving && (
        <div className={styles.successMessage}>
          <p>
            ✅ Approval successful! Automatically proceeding with staking...
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
          }`}
        >
          {isApprovalLoading
            ? "Approving..."
            : isStakingLoading
            ? "Staking..."
            : "Stake"}
        </button>
      </div>
    </div>
  );
};

export default StakeTokens;
