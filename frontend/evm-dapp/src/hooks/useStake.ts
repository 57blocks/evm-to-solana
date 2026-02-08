import { useState, useEffect, useRef } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { Hash, maxUint256 } from "viem";
import {
  STAKING_CONTRACT_ADDRESS,
  STAKING_TOKEN_ADDRESS,
} from "../../consts";
import { stakingAbi } from "../../abi/stakeAbi";
import { stakingTokenAbi } from "../../abi/StakingTokenABI";
import { convertToWei, validateTokenAmount } from "../utils/tokenUtils";

export interface UseStakeReturn {
  // State
  stakeAmount: string;
  isWaitingForWallet: boolean;
  isApproving: boolean;

  // Loading states
  isStakingLoading: boolean;

  // Transaction hashes
  stakeTransactionHash: Hash | null;

  // Actions
  setStakeAmount: (amount: string) => void;
  handleStake: () => Promise<void>;

  // Computed states
  isDisabled: boolean;
}

export const useStake = (
  onTransactionSuccess?: () => void,
  onError?: (message: string) => void,
  onStakeTransactionStart?: (transactionHash: string) => void
): UseStakeReturn => {
  const [stakeAmount, setStakeAmount] = useState("");
  const [stakeTransactionHash, setStakeTransactionHash] = useState<Hash | null>(
    null
  );
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [isWaitingForWallet, setIsWaitingForWallet] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isStakingLoading, setIsStakingLoading] = useState(false);

  const stakeAmountRef = useRef("");
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Update stakeAmountRef when stakeAmount changes
  useEffect(() => {
    stakeAmountRef.current = stakeAmount;
  }, [stakeAmount]);

  const resetState = () => {
    setIsButtonClicked(false);
    setIsWaitingForWallet(false);
    setIsApproving(false);
    setIsStakingLoading(false);
    setStakeTransactionHash(null);
  };

  const handleStake = async () => {
    if (!isConnected || !address) {
      onError?.("Please connect your wallet first");
      return;
    }

    if (!stakeAmount || isStakingLoading || isApproving || isButtonClicked) {
      return;
    }

    // Validate input
    const validation = validateTokenAmount(stakeAmount);
    if (!validation.isValid) {
      onError?.(validation.error || "Invalid amount");
      return;
    }

    if (!publicClient) {
      onError?.("Network client not available");
      return;
    }

    // Immediately disable button to prevent multiple clicks
    setIsButtonClicked(true);

    // Convert to wei (e.g. "2" tokens -> 2000000000000000000n wei)
    const stakeAmountWei = convertToWei(stakeAmount);

    try {
      // Step 1: Check current allowance
      const currentAllowance = await publicClient.readContract({
        address: STAKING_TOKEN_ADDRESS as `0x${string}`,
        abi: stakingTokenAbi,
        functionName: "allowance",
        args: [address, STAKING_CONTRACT_ADDRESS],
      });

      // Step 2: If allowance insufficient, approve maxUint256
      if (
        typeof currentAllowance === "bigint" &&
        currentAllowance < stakeAmountWei
      ) {
        setIsApproving(true);
        setIsWaitingForWallet(true);

        const approveHash = await writeContractAsync({
          address: STAKING_TOKEN_ADDRESS as `0x${string}`,
          abi: stakingTokenAbi,
          functionName: "approve",
          args: [STAKING_CONTRACT_ADDRESS, maxUint256],
        });

        setIsWaitingForWallet(false);

        // Wait for approval transaction to be confirmed
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        setIsApproving(false);
      }

      // Step 3: Call stake
      setIsStakingLoading(true);
      setIsWaitingForWallet(true);

      const stakeTxHash = await writeContractAsync({
        address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
        abi: stakingAbi,
        functionName: "stake",
        args: [stakeAmountWei],
      });

      setStakeTransactionHash(stakeTxHash);
      setIsWaitingForWallet(false);

      // Notify parent about the transaction start
      onStakeTransactionStart?.(stakeTxHash);

      // Wait for staking transaction to be confirmed
      await publicClient.waitForTransactionReceipt({ hash: stakeTxHash });

      // Success - clear form and notify parent
      setStakeAmount("");
      stakeAmountRef.current = "";
      onTransactionSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";

      if (isApproving) {
        onError?.(`Approval failed: ${message}`);
      } else {
        onError?.(`Staking failed: ${message}`);
      }
    } finally {
      resetState();
    }
  };

  const isDisabled =
    !isConnected || isStakingLoading || isApproving || isButtonClicked;

  return {
    // State
    stakeAmount,
    isWaitingForWallet,
    isApproving,

    // Loading states
    isStakingLoading,

    // Transaction hashes
    stakeTransactionHash,

    // Actions
    setStakeAmount,
    handleStake,

    // Computed states
    isDisabled,
  };
};
