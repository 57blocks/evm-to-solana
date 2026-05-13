import { forwardRef, useImperativeHandle } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRewardHistory, ActivityRecord } from "../hooks/useRewardHistory";
import { convertFromLamports } from "../utils/tokenUtils";

export interface RewardHistoryRef {
  refresh: () => void;
}

function formatAmount(lamportStr: string): string {
  const abs = lamportStr.startsWith("-") ? lamportStr.slice(1) : lamportStr;
  const value = convertFromLamports(BigInt(abs));
  return lamportStr.startsWith("-") ? `-${value.toFixed(4)}` : value.toFixed(4);
}

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

function truncateTxHash(hash: string): string {
  return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
}

const EVENT_LABELS: Record<string, string> = {
  Staked: "Stake",
  Unstaked: "Unstake",
  RewardsClaimed: "Claim",
};

const RewardHistory = forwardRef<RewardHistoryRef>((_, ref) => {
  const { publicKey } = useWallet();
  const { rewards, activities, refetchAll } = useRewardHistory(publicKey);

  useImperativeHandle(ref, () => ({
    refresh: refetchAll,
  }));

  if (!publicKey) return null;

  const isLoading = rewards.isLoading;
  const error = rewards.error;

  return (
    <div className="bg-white/95 rounded-2xl shadow-xl backdrop-blur-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Reward History</h2>
        <button
          onClick={refetchAll}
          className="px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-semibold rounded-lg hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Loading...
            </span>
          ) : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-red-700 text-sm">
          Error loading rewards: {(error as Error).message}
        </div>
      )}

      {!error && (
        <>
          {/* Totals */}
          {rewards.data && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600">Total Staked</div>
                <div className="text-lg font-semibold text-gray-900">{formatAmount(rewards.data.totalStaked)}</div>
              </div>
              <div className="bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600">Pending Rewards</div>
                <div className="text-lg font-semibold text-gray-900">{formatAmount(rewards.data.totalPendingRewards)}</div>
              </div>
              <div className="bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600">Claimed Rewards</div>
                <div className="text-lg font-semibold text-gray-900">{formatAmount(rewards.data.totalClaimedRewards)}</div>
              </div>
            </div>
          )}

          {/* Activity History Table */}
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Transaction History</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10">
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold border-b border-gray-200 text-sm">Type</th>
                  <th className="px-4 py-3 text-right text-gray-700 font-semibold border-b border-gray-200 text-sm">Amount</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold border-b border-gray-200 text-sm">Tx Hash</th>
                  <th className="px-4 py-3 text-left text-gray-700 font-semibold border-b border-gray-200 text-sm">Time</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin" />
                        <span>Loading activity history...</span>
                      </div>
                    </td>
                  </tr>
                ) : activities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No activity history
                    </td>
                  </tr>
                ) : (
                  activities.map((activity: ActivityRecord) => (
                    <tr key={activity.txHash} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          activity.eventType === "Staked" ? "bg-green-100 text-green-700" :
                          activity.eventType === "Unstaked" ? "bg-orange-100 text-orange-700" :
                          "bg-purple-100 text-purple-700"
                        }`}>
                          {EVENT_LABELS[activity.eventType] || activity.eventType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800 font-medium">{formatAmount(activity.amount)}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-sm">
                        <a
                          href={`https://explorer.solana.com/tx/${activity.txHash}?cluster=testnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#667eea] transition-colors"
                        >
                          {truncateTxHash(activity.txHash)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{formatTimestamp(activity.timestamp)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
});

RewardHistory.displayName = "RewardHistory";

export default RewardHistory;
