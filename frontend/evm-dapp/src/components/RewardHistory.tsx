import React from "react";
import styles from "../styles/RewardHistory.module.css";
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
if (!process.env.NEXT_PUBLIC_GRAPH_API_KEY) {
  console.warn("NEXT_PUBLIC_GRAPH_API_KEY is not set. Graph queries may fail.");
}

if (!process.env.NEXT_PUBLIC_GRAPH_URL) {
  console.warn("NEXT_PUBLIC_GRAPH_URL is not set. Graph queries will fail.");
}

const headers = {
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ""}`,
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
        process.env.NEXT_PUBLIC_GRAPH_URL || "",
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
      <div className={styles.tableContainer}>
        <div className={styles.headerRow}>
          <h2 className={styles.tableTitle}>Reward History</h2>
          <button
            onClick={handleRefresh}
            className={styles.refreshButton}
            title="Refresh reward history"
          >
            🔄 Refresh
          </button>
        </div>
        <div className={styles.errorMessage}>
          Error loading reward history: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <div className={styles.headerRow}>
        <h2 className={styles.tableTitle}>Reward History</h2>
        <button
          onClick={handleRefresh}
          className={styles.refreshButton}
          title="Refresh reward history"
          disabled={isAnyLoading}
        >
          {isAnyLoading ? "⏳ Loading..." : "🔄 Refresh"}
        </button>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Reward</th>
              <th>Block Number</th>
            </tr>
          </thead>
          <tbody>
            {isAnyLoading ? (
              <tr>
                <td colSpan={3} className={styles.loadingMessage}>
                  <div className={styles.loadingContent}>
                    <div className={styles.loadingSpinner}></div>
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
                <td colSpan={3} className={styles.emptyMessage}>
                  No reward history
                </td>
              </tr>
            ) : (
              data.rewardClaimeds.map((record: RewardRecord) => (
                <tr key={record.id}>
                  <td>{record.id}</td>
                  <td>{formatTokenAmount(BigInt(record.reward))}</td>
                  <td>{record.blockNumber}</td>
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
