import React from "react";
import styles from "../styles/RewardHistory.module.css";
import { useQuery } from "@tanstack/react-query";
import { formatTokenAmount } from "../utils/tokenUtils";

interface RewardHistoryProps {}

interface RewardRecord {
  id: string;
  user: string;
  reward: string;
  blockNumber: string;
}

const RewardHistory: React.FC<RewardHistoryProps> = () => {
  // Mock data for now - TODO: Replace with actual Solana program queries
  const { data, refetch, isLoading, error, isRefetching } = useQuery<{
    rewardClaimeds: RewardRecord[];
  }>({
    queryKey: ["reward-history"],
    queryFn: async () => {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Return mock data
      return {
        rewardClaimeds: [
          {
            id: "1",
            user: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
            reward: "100000000", // 0.1 token
            blockNumber: "12345",
          },
          {
            id: "2",
            user: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
            reward: "200000000", // 0.2 token
            blockNumber: "12340",
          },
        ],
      };
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
              <th>User</th>
              <th>Reward</th>
              <th>Block Number</th>
            </tr>
          </thead>
          <tbody>
            {isAnyLoading ? (
              <tr>
                <td colSpan={4} className={styles.loadingMessage}>
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
                <td colSpan={4} className={styles.emptyMessage}>
                  No reward history
                </td>
              </tr>
            ) : (
              data.rewardClaimeds.map((record: RewardRecord) => (
                <tr key={record.id}>
                  <td>{record.id}</td>
                  <td className={styles.userAddress}>
                    {record.user.slice(0, 4)}...{record.user.slice(-4)}
                  </td>
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
