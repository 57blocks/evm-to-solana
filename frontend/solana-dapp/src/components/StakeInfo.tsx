import {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import useUserStakeInfo from "@/hooks/useUserStakeInfo";
import { UserStakeInfo } from "@/hooks/useUserStakeInfo";
import { useProgram } from "@/hooks/useProgram";
import { formatErrorForDisplay } from "@/utils/programErrors";

export interface StakeInfoRef {
  refresh: () => void;
}

const StakeInfo = forwardRef<StakeInfoRef>((_, ref) => {
  const { publicKey, connected } = useWallet();
  const [stakeInfo, setStakeInfo] = useState<UserStakeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { fetchUserStakeInfo } = useUserStakeInfo();
  const { program } = useProgram();

  const loadStakeInfo = useCallback(async () => {
    if (!publicKey || !program) return;

    setIsLoading(true);

    try {
      const userStakeInfo = await fetchUserStakeInfo(publicKey);
      setStakeInfo(userStakeInfo ?? null);
    } catch (err) {
      console.error(
        "Error loading stake info:",
        formatErrorForDisplay(err).message
      );
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, fetchUserStakeInfo, program]);

  useEffect(() => {
    if (connected && publicKey && program) {
      void loadStakeInfo();
    } else {
      setStakeInfo(null);
    }
  }, [connected, publicKey, program]);

  const handleRefresh = useCallback(async () => {
    if (!publicKey) {
      console.error("Public key is not set");
      return;
    }
    await loadStakeInfo();
  }, [publicKey, loadStakeInfo]);

  // Expose refresh method to parent component
  useImperativeHandle(
    ref,
    () => ({
      refresh: handleRefresh,
    }),
    [handleRefresh]
  );

  if (!connected) {
    return (
      <div className="bg-white/95 rounded-2xl shadow-xl backdrop-blur-sm p-6 h-full flex flex-col">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Stake Information
        </h3>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>Please connect your wallet to view stake information.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white/95 rounded-2xl shadow-xl backdrop-blur-sm p-6 h-full flex flex-col">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Stake Information
        </h3>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#667eea] rounded-full animate-spin mb-3" />
          <p className="text-gray-600">Loading stake information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 rounded-2xl shadow-xl backdrop-blur-sm p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Stake Information</h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          title="Refresh stake information"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <span className={isLoading ? "animate-spin" : ""}>
            {isLoading ? "⟳" : "🔄"}
          </span>
          <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {stakeInfo ? (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <label className="font-medium text-gray-700">
                Staked Amount:
              </label>
              <span className="font-mono font-semibold text-gray-900 bg-white px-3 py-1.5 rounded-lg">
                {stakeInfo.amount} tokens
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <label className="font-medium text-gray-700">Staking Time:</label>
              <span className="font-mono font-semibold text-gray-900 bg-white px-3 py-1.5 rounded-lg">
                {stakeInfo.stakeTimestamp}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <label className="font-medium text-gray-700">Reward Debt:</label>
              <span className="font-mono font-semibold text-gray-900 bg-white px-3 py-1.5 rounded-lg">
                {stakeInfo.rewardDebt} tokens
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <label className="font-medium text-gray-700">
                Last Claim Time:
              </label>
              <span className="font-mono font-semibold text-gray-900 bg-white px-3 py-1.5 rounded-lg">
                {stakeInfo.lastClaimTime}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>No stake information available.</p>
          </div>
        )}
      </div>
    </div>
  );
});

StakeInfo.displayName = "StakeInfo";

export default StakeInfo;
