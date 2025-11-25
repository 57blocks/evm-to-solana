import React from "react";
import { gql, request } from "graphql-request";
import { useQuery } from "@tanstack/react-query";
import { formatTokenAmount } from "../utils/tokenUtils";

interface RewardHistoryProps {}
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

// Validate environment variable
if (!import.meta.env.VITE_GRAPH_API_KEY) {
  console.warn("VITE_GRAPH_API_KEY is not set. Graph queries may fail.");
}

if (!import.meta.env.VITE_GRAPH_URL) {
  console.warn("VITE_GRAPH_URL is not set. Graph queries will fail.");
}

const headers = {
  Authorization: `Bearer ${import.meta.env.VITE_GRAPH_API_KEY || ""}`,
};
interface RewardRecord {
  id: string;
  user: string;
  reward: string;
  blockNumber: string;
}

const RewardHistory: React.FC<RewardHistoryProps> = () => {
  const { data, refetch, isLoading, error, isRefetching } = useQuery<{
    rewardClaimeds: RewardRecord[];
  }>({
    queryKey: ["reward-history"],
    async queryFn() {
      return await request(
        import.meta.env.VITE_GRAPH_URL || "",
        query,
        {},
        headers
      );
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when window gains focus
    staleTime: 10000, // Data is considered stale after 10 seconds
  });

  const handleRefresh = async () => {
    await refetch();
  };

  // Show loading state for both initial load and refresh
  const isAnyLoading = isLoading || isRefetching;

  if (error) {
    return (
      <div className="w-full bg-white/95 rounded-2xl shadow-lg backdrop-blur-md border border-white/20 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="m-0 text-gray-800 text-2xl font-semibold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            Reward History
          </h2>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-semibold rounded-lg hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            title="Refresh reward history"
          >
            🔄 Refresh
          </button>
        </div>
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-red-700">
          Error loading reward history: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white/95 rounded-2xl shadow-lg backdrop-blur-md border border-white/20 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="m-0 text-gray-800 text-2xl font-semibold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          Reward History
        </h2>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-semibold rounded-lg hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          title="Refresh reward history"
          disabled={isAnyLoading}
        >
          {isAnyLoading ? "⏳ Loading..." : "🔄 Refresh"}
        </button>
      </div>
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
            {isAnyLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-[#667eea] border-t-transparent rounded-full animate-spin"></div>
                    <span>
                      {isLoading
                        ? "Loading reward history..."
                        : "Refreshing reward history..."}
                    </span>
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
};

export default RewardHistory;
