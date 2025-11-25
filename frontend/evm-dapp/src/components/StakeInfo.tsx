import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useAccount, useReadContract } from "wagmi";
import { STAKING_CONTRACT_ADDRESS } from "../../consts";
import { stakingAbi } from "../../abi/stakeAbi";
import { Address } from "viem";
import { formatTokenAmount } from "../utils/tokenUtils";

interface StakeInfoData {
  stakedAmount: bigint;
  stakingTimestamp: bigint;
  pendingReward: bigint;
  claimedReward: bigint;
}

export interface StakeInfoRef {
  refresh: () => void;
}

const StakeInfo = forwardRef<StakeInfoRef>((_, ref) => {
  const { address, isConnected } = useAccount();
  const [stakeInfo, setStakeInfo] = useState<StakeInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data: stakeInfoData,
    isLoading: isReading,
    error: readError,
    refetch,
  } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: stakingAbi,
    functionName: "getStakeInfo",
    args: [address as Address],
    query: {
      enabled: !!address && isConnected,
    },
  });

  useEffect(() => {
    if (
      stakeInfoData &&
      Array.isArray(stakeInfoData) &&
      stakeInfoData.length === 4
    ) {
      const [stakedAmount, stakingTimestamp, pendingReward, claimedReward] =
        stakeInfoData;
      setStakeInfo({
        stakedAmount,
        stakingTimestamp,
        pendingReward,
        claimedReward,
      });
      setError(null);
    }
  }, [stakeInfoData]);

  useEffect(() => {
    if (readError) {
      setError(`Failed to load stake info: ${readError.message}`);
    }
  }, [readError]);

  const formatTimestamp = (timestamp: bigint) => {
    if (timestamp === BigInt(0)) return "Not staked yet";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString("en-US");
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await refetch();
    } catch (error) {
      setError(
        `Failed to refresh: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refresh: handleRefresh,
  }));

  if (!isConnected) {
    return (
      <div className="bg-white/95 rounded-2xl p-6 shadow-lg backdrop-blur-md border border-white/20 h-full min-h-[400px] flex flex-col md:min-h-[350px] sm:p-4 sm:min-h-[300px]">
        <h3 className="m-0 text-2xl font-semibold text-gray-800 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent sm:text-xl">
          Stake Information
        </h3>
        <div className="text-center py-10 px-5 text-gray-500 bg-gray-50/50 rounded-lg flex-1 flex items-center justify-center sm:py-10 sm:px-5">
          <p>Please connect your wallet to view stake information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 rounded-2xl p-6 shadow-lg backdrop-blur-md border border-white/20 h-full min-h-[400px] flex flex-col md:min-h-[350px] sm:p-4 sm:min-h-[300px]">
      <div className="flex justify-between items-center mb-5 pb-4 border-b border-black/10 sm:flex-col sm:gap-3 sm:items-start">
        <h3 className="m-0 text-2xl font-semibold text-gray-800 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent sm:text-xl">
          Stake Information
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading || isReading}
          className={`bg-gradient-to-r from-[#667eea] to-[#764ba2] border-none rounded-lg px-4 py-2 text-sm cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 text-white font-medium w-[120px] h-10 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none`}
        >
          <span className="inline-block w-4 text-center transition-all duration-200 flex-shrink-0 relative">
            <span
              className={`transition-opacity duration-200 ${
                isLoading || isReading ? "opacity-0" : "opacity-100"
              }`}
            >
              🔄
            </span>
            <span
              className={`absolute top-0 left-0 transition-opacity duration-200 animate-spin ${
                isLoading || isReading ? "opacity-100" : "opacity-0"
              }`}
            >
              ⟳
            </span>
          </span>
          <span className="transition-all duration-200 flex-shrink-0 whitespace-nowrap relative">
            <span
              className={`transition-opacity duration-200 ${
                isLoading || isReading ? "opacity-0" : "opacity-100"
              }`}
            >
              Refresh
            </span>
            <span
              className={`absolute top-0 left-0 transition-opacity duration-200 ${
                isLoading || isReading ? "opacity-100" : "opacity-0"
              }`}
            >
              Refreshing...
            </span>
          </span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4 text-red-700">
          <p className="m-0">{error}</p>
        </div>
      )}

      <div className="flex-1 min-h-[300px] flex flex-col">
        {isReading || isLoading ? (
          <div className="text-center py-10 px-5 text-gray-500 flex-1 flex items-center justify-center">
            <p className="m-0">Loading stake information...</p>
          </div>
        ) : stakeInfo ? (
          <div className="grid grid-cols-1 gap-4 flex-1 lg:grid-cols-2 sm:grid-cols-1 sm:gap-3">
            <div className="relative bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-xl p-5 text-center transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:shadow-lg before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-gradient-to-r before:from-[#667eea] before:to-[#764ba2] sm:p-4">
              <h4 className="m-0 mb-3 text-sm font-medium text-gray-600 uppercase tracking-wider">
                Staked Amount
              </h4>
              <p className="m-0 text-2xl font-bold text-gray-800 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent sm:text-xl">
                {formatTokenAmount(stakeInfo.stakedAmount)} Tokens
              </p>
            </div>

            <div className="relative bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-xl p-5 text-center transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:shadow-lg before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-gradient-to-r before:from-[#667eea] before:to-[#764ba2] sm:p-4">
              <h4 className="m-0 mb-3 text-sm font-medium text-gray-600 uppercase tracking-wider">
                Staking Date
              </h4>
              <p className="m-0 text-2xl font-bold text-gray-800 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent sm:text-xl">
                {stakeInfo.stakingTimestamp > BigInt(0)
                  ? formatTimestamp(stakeInfo.stakingTimestamp)
                  : "Not staked yet"}
              </p>
            </div>

            <div className="relative bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-xl p-5 text-center transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:shadow-lg before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-gradient-to-r before:from-[#667eea] before:to-[#764ba2] sm:p-4">
              <h4 className="m-0 mb-3 text-sm font-medium text-gray-600 uppercase tracking-wider">
                Pending Rewards
              </h4>
              <p className="m-0 text-2xl font-bold text-gray-800 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent sm:text-xl">
                {formatTokenAmount(stakeInfo.pendingReward)} Tokens
              </p>
            </div>

            <div className="relative bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-xl p-5 text-center transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:shadow-lg before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-gradient-to-r before:from-[#667eea] before:to-[#764ba2] sm:p-4">
              <h4 className="m-0 mb-3 text-sm font-medium text-gray-600 uppercase tracking-wider">
                Claimed Rewards
              </h4>
              <p className="m-0 text-2xl font-bold text-gray-800 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent sm:text-xl">
                {formatTokenAmount(stakeInfo.claimedReward)} Tokens
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 px-5 text-gray-500 bg-gray-50/50 rounded-lg flex-1 flex items-center justify-center">
            <p className="m-0">No stake information found</p>
          </div>
        )}
      </div>
    </div>
  );
});

StakeInfo.displayName = "StakeInfo";

export default StakeInfo;
