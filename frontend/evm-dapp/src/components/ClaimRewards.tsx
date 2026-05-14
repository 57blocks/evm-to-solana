import React, { useState, useEffect } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { STAKING_CONTRACT_ADDRESS } from "../../consts";
import { stakingAbi } from "../../abi/stakeAbi";

interface ClaimRewardsProps {
  onTransactionSuccess?: () => void;
  onError: (message: string) => void;
}

const ClaimRewards: React.FC<ClaimRewardsProps> = ({
  onTransactionSuccess,
  onError,
}) => {
  const [isWaitingForWallet, setIsWaitingForWallet] = useState(false);
  const { isConnected } = useAccount();

  const {
    writeContract,
    data: claimHash,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isClaimingLoading,
    isSuccess: isClaimingSuccess,
    error: claimError,
  } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  useEffect(() => {
    if (claimHash) {
      setIsWaitingForWallet(false);
    }
  }, [claimHash]);

  useEffect(() => {
    if (writeError) {
      onError(
        `Claim failed: ${writeError.message || "Unknown error occurred"}`
      );
      resetWrite();
    } else if (claimError) {
      onError(
        `Claim failed: ${claimError.message || "Transaction reverted"}`
      );
    }
  }, [writeError, claimError, onError, resetWrite]);

  useEffect(() => {
    if (isClaimingSuccess) {
      onTransactionSuccess?.();
    }
  }, [isClaimingSuccess, onTransactionSuccess]);

  const handleClaim = () => {
    if (!isConnected) return;

    try {
      writeContract({
        address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
        abi: stakingAbi,
        functionName: "claimRewards",
      });
      setIsWaitingForWallet(true);
    } catch (error) {
      onError(
        `Failed to initiate claim: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const isProcessing = isWaitingForWallet || isClaimingLoading;
  const isDisabled = !isConnected || isProcessing;

  return (
    <div>
      {isWaitingForWallet && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4 text-center animate-in slide-in-from-top duration-300">
          <p className="m-0 text-yellow-700 font-medium text-sm flex items-center justify-center gap-2">
            Waiting for wallet confirmation... Please check your wallet and
            confirm the claim transaction.
          </p>
        </div>
      )}

      <button
        onClick={handleClaim}
        disabled={isDisabled}
        className={`w-full px-6 py-3 border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 uppercase tracking-wider relative overflow-hidden ${
          isDisabled && !isProcessing
            ? "bg-gray-400 text-gray-600 cursor-not-allowed"
            : isProcessing
            ? "bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md cursor-wait"
            : "bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md hover:from-[#5a6fd6] hover:to-[#6a4299] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
        }`}
      >
        {isProcessing ? (
          <>
            <span className="inline-block animate-spin mr-2">&#x27F3;</span>
            {isWaitingForWallet ? "Waiting for wallet..." : "Processing..."}
          </>
        ) : (
          "Claim Rewards"
        )}
      </button>
    </div>
  );
};

export default ClaimRewards;
