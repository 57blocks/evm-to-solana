import { useState, useEffect, useRef } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { Hash } from "viem";
import { STAKING_CONTRACT_ADDRESS, STAKING_TOKEN_ADDRESS } from "../../consts";
import { stakingAbi } from "../../abi/stakeAbi";
import { stakingTokenAbi } from "../../abi/StakingTokenABI";
import { convertToWei, validateTokenAmount } from "../utils/tokenUtils";

export interface UseStakeReturn {
  // State
  stakeAmount: string;
  isApproving: boolean;
  isWaitingForWallet: boolean;
  currentAllowance: bigint | undefined;

  // Loading states
  isStakingLoading: boolean;
  isApprovalLoading: boolean;
  isAllowanceLoading: boolean;

  // Transaction hashes
  approvalHash: Hash | null;
  stakeTransactionHash: Hash | null;

  // Success states
  isApprovalSuccess: boolean;

  // Actions
  setStakeAmount: (amount: string) => void;
  handleStake: () => Promise<void>;

  // Computed states
  isDisabled: boolean;
}

export const useStake = (
  onTransactionSuccess?: () => void,
  onError?: (message: string) => void
): UseStakeReturn => {
  const [stakeAmount, setStakeAmount] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [approvalHash, setApprovalHash] = useState<Hash | null>(null);
  const [stakeTransactionHash, setStakeTransactionHash] = useState<Hash | null>(
    null
  );
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [isWaitingForWallet, setIsWaitingForWallet] = useState(false);
  const [currentTransactionType, setCurrentTransactionType] = useState<
    "approve" | "stake" | null
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

  // Set approval hash when writeContract data changes for approval
  useEffect(() => {
    if (writeData && currentTransactionType === "approve" && !approvalHash) {
      setApprovalHash(writeData as Hash);
      setIsWaitingForWallet(false);
    }
  }, [writeData, currentTransactionType, approvalHash]);

  // Set stake transaction hash when writeContract data changes for stake
  useEffect(() => {
    if (
      writeData &&
      currentTransactionType === "stake" &&
      !stakeTransactionHash
    ) {
      setStakeTransactionHash(writeData as Hash);
      setIsWaitingForWallet(false);
    }
  }, [writeData, currentTransactionType, stakeTransactionHash]);

  // Handle error messages
  useEffect(() => {
    if (writeError && onError) {
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
      setIsButtonClicked(false);
    }
  }, [writeError, currentTransactionType, onError]);

  // Handle transaction receipt errors
  useEffect(() => {
    if ((isStakingError || isApprovalError) && onError) {
      if (isStakingError) {
        onError(
          `Staking transaction failed: ${
            isStakingError.message || "Transaction reverted"
          }`
        );
      } else if (isApprovalError) {
        onError(
          `Approval transaction failed: ${
            isApprovalError.message || "Transaction reverted"
          }`
        );
      }
      setIsApproving(false);
      setCurrentTransactionType(null);
      setIsButtonClicked(false);
    }
  }, [isStakingError, isApprovalError, onError]);

  // Handle staking success
  useEffect(() => {
    if (isStakingSuccess) {
      console.log("Staking transaction successful!");
      setIsApproving(false);
      setCurrentTransactionType(null);
      setIsButtonClicked(false);

      // Refresh allowance after successful staking
      refetchAllowance();

      // Clear form and notify parent when staking is successful
      const currentStakeAmount = stakeAmountRef.current;
      if (currentStakeAmount) {
        setStakeAmount("");
        stakeAmountRef.current = "";
        if (onTransactionSuccess) {
          onTransactionSuccess();
        }
      }
    }
  }, [isStakingSuccess, onTransactionSuccess, refetchAllowance]);

  // Handle approval success and auto-stake when allowance is sufficient
  useEffect(() => {
    if (isApprovalSuccess && isApproving && approvalHash) {
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

  // Update stakeAmountRef when stakeAmount changes
  useEffect(() => {
    stakeAmountRef.current = stakeAmount;
  }, [stakeAmount]);

  const handleStake = async () => {
    if (!isConnected) {
      onError?.("Please connect your wallet first");
      return;
    }

    if (
      !stakeAmount ||
      isStakingLoading ||
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
      onError?.(validation.error || "Invalid amount");
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
      setApprovalHash(null);
      setCurrentTransactionType("approve");

      try {
        writeContract({
          address: STAKING_TOKEN_ADDRESS,
          abi: stakingTokenAbi,
          functionName: "approve",
          args: [STAKING_CONTRACT_ADDRESS, stakeAmountWei],
        });
        setIsWaitingForWallet(true);
      } catch (error) {
        onError?.(
          `Failed to approve tokens: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setIsApproving(false);
        setIsButtonClicked(false);
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
        setIsWaitingForWallet(true);
      } catch (error) {
        onError?.(
          `Failed to initiate stake: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setIsButtonClicked(false);
      }
    }
  };

  const isDisabled =
    !isConnected ||
    isStakingLoading ||
    isApproving ||
    isApprovalLoading ||
    isButtonClicked;

  return {
    // State
    stakeAmount,
    isApproving,
    isWaitingForWallet,
    currentAllowance: currentAllowance as bigint | undefined,

    // Loading states
    isStakingLoading,
    isApprovalLoading,
    isAllowanceLoading,

    // Transaction hashes
    approvalHash,
    stakeTransactionHash,

    // Success states
    isApprovalSuccess,

    // Actions
    setStakeAmount,
    handleStake,

    // Computed states
    isDisabled,
  };
};
