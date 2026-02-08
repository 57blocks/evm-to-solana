import React, { useState, useEffect, useRef } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { STAKING_CONTRACT_ADDRESS } from "../../consts";
import { stakingAbi } from "../../abi/stakeAbi";
import { convertToWei, validateTokenAmount } from "../utils/tokenUtils";

interface UnstakeTokensProps {
  onTransactionSuccess?: () => void;
  onError: (message: string) => void;
}

const UnstakeTokens: React.FC<UnstakeTokensProps> = ({
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
      // Clear form and notify parent when unstaking is successful
      const currentUnstakeAmount = unstakeAmountRef.current;
      if (currentUnstakeAmount) {
        setUnstakeAmount("");
        unstakeAmountRef.current = "";
        setIsButtonClicked(false); // Re-enable button after success
        // Notify parent component to refresh stake information immediately after transaction success
        if (onTransactionSuccess) {
          onTransactionSuccess();
        }
      }
    }
  }, [isUnstakingSuccess, onTransactionSuccess]);

  const handleUnstake = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!unstakeAmount || isUnstakingLoading || isButtonClicked) {
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

  const isDisabled = !isConnected || isUnstakingLoading || isButtonClicked;

  return (
    <div>
      {/* Show waiting for wallet confirmation message */}
      {isWaitingForWallet && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4 text-center animate-in slide-in-from-top duration-300">
          <p className="m-0 text-yellow-700 font-medium text-sm flex items-center justify-center gap-2">
            ⏳ Waiting for wallet confirmation... Please check your wallet and
            confirm the unstaking transaction.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <input
          type="number"
          min="0"
          step="1"
          value={unstakeAmount}
          onKeyDown={(e) => {
            // Block e, E, +, -, . which are allowed by type="number"
            if (["e", "E", "+", "-", "."].includes(e.key)) {
              e.preventDefault();
            }
          }}
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
          className="px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-colors duration-200 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-300"
          disabled={isDisabled}
        />
        <button
          onClick={handleUnstake}
          disabled={
            !unstakeAmount || isDisabled || parseInt(unstakeAmount) <= 0
          }
          className={`px-6 py-3 border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 uppercase tracking-wider relative overflow-hidden ${
            isDisabled
              ? "bg-gray-400 text-gray-600 cursor-not-allowed transform-none shadow-none hover:bg-gray-400 hover:transform-none hover:shadow-none"
              : isUnstakingLoading
              ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md cursor-wait hover:transform-none hover:shadow-md"
              : "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md hover:from-red-600 hover:to-red-700 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          }`}
        >
          {isUnstakingLoading ? (
            <>
              <span className="inline-block animate-spin mr-2">⟳</span>
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
