import { forwardRef, useImperativeHandle } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Address } from "viem";
import { gql, request } from "graphql-request";
import { useQuery } from "@tanstack/react-query";
import { STAKING_CONTRACT_ADDRESS } from "../../consts";
import { stakingAbi } from "../../abi/stakeAbi";
import { formatTokenAmount } from "../utils/tokenUtils";

export interface RewardHistoryRef {
  refresh: () => void;
}
const query = gql`
  {
    rewardClaimeds(first: 10, orderBy: blockNumber, orderDirection: desc) {
      id
      user
      reward
      blockNumber
    }
  }
`;

const GRAPH_URL = import.meta.env.VITE_GRAPH_URL || "";
const GRAPH_API_KEY = import.meta.env.VITE_GRAPH_API_KEY || "";
const headers: Record<string, string> = GRAPH_API_KEY ? { Authorization: `Bearer ${GRAPH_API_KEY}` } : {};
interface RewardRecord {
  id: string;
  user: string;
  reward: string;
  blockNumber: string;
}

const RewardHistory = forwardRef<RewardHistoryRef>((_, ref) => {
  const { address, isConnected } = useAccount();

  // Stake info from contract
  const {
    data: stakeInfoData,
    refetch: refetchStakeInfo,
  } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: stakingAbi,
    functionName: "getStakeInfo",
    args: [address as Address],
    query: {
      enabled: !!address && isConnected,
    },
  });

  const stakedAmount = stakeInfoData && Array.isArray(stakeInfoData) ? stakeInfoData[0] as bigint : 0n;
  const claimedReward = stakeInfoData && Array.isArray(stakeInfoData) ? stakeInfoData[2] as bigint : 0n;

  // Reward history from subgraph
  const { data, refetch, isLoading, error } = useQuery<{
    rewardClaimeds: RewardRecord[];
  }>({
    queryKey: ["reward-history"],
    async queryFn() {
      return await request(GRAPH_URL, query, {}, headers);
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchStakeInfo()]);
  };

  useImperativeHandle(ref, () => ({
    refresh: handleRefresh,
  }));

  return (
    <div className="w-full bg-white/95 rounded-2xl shadow-lg backdrop-blur-md border border-white/20 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="m-0 text-gray-800 text-2xl font-semibold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          Stake Overview & Reward History
        </h2>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-semibold rounded-lg hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          title="Refresh"
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Summary Cards */}
      {isConnected && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-xl p-4 text-center">
            <h4 className="m-0 mb-2 text-sm font-medium text-gray-600 uppercase tracking-wider">
              Staked Amount
            </h4>
            <p className="m-0 text-xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
              {formatTokenAmount(stakedAmount)} Tokens
            </p>
          </div>
          <div className="bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-xl p-4 text-center">
            <h4 className="m-0 mb-2 text-sm font-medium text-gray-600 uppercase tracking-wider">
              Claimed Rewards
            </h4>
            <p className="m-0 text-xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
              {formatTokenAmount(claimedReward)} Tokens
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-red-700 mb-4">
          Error loading reward history: {error.message}
        </div>
      )}

      {/* History Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10">
              <th className="px-4 py-3 text-left text-gray-700 font-semibold border-b border-gray-200">ID</th>
              <th className="px-4 py-3 text-left text-gray-700 font-semibold border-b border-gray-200">Reward</th>
              <th className="px-4 py-3 text-left text-gray-700 font-semibold border-b border-gray-200">Block Number</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading reward history...</span>
                  </div>
                </td>
              </tr>
            ) : !data?.rewardClaimeds || data.rewardClaimeds.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  No reward history
                </td>
              </tr>
            ) : (
              data.rewardClaimeds.map((record: RewardRecord) => (
                <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-800">{record.id}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{formatTokenAmount(BigInt(record.reward))}</td>
                  <td className="px-4 py-3 text-gray-600">{record.blockNumber}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

RewardHistory.displayName = "RewardHistory";

export default RewardHistory;
