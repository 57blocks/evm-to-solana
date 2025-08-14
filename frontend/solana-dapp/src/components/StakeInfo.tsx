import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import styles from "../styles/StakeInfo.module.css";
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

const StakeInfo = forwardRef<StakeInfoRef>((props, ref) => {
  const { publicKey, connected } = useWallet();
  const [stakeInfo, setStakeInfo] = useState<StakeInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data for now - TODO: Replace with actual Solana program calls
  useEffect(() => {
    if (connected && publicKey) {
      // Simulate loading stake info
      setIsLoading(true);
      setTimeout(() => {
        setStakeInfo({
          stakedAmount: BigInt(1000000000), // 1 token in lamports
          stakingTimestamp: BigInt(Math.floor(Date.now() / 1000)),
          pendingReward: BigInt(50000000), // 0.05 token
          claimedReward: BigInt(200000000), // 0.2 token
        });
        setIsLoading(false);
      }, 1000);
    }
  }, [connected, publicKey]);

  const formatTimestamp = (timestamp: bigint) => {
    if (timestamp === BigInt(0)) return "Not staked yet";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString("en-US");
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual refresh logic
      await new Promise((resolve) => setTimeout(resolve, 1000));
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

  if (!connected) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Stake Information</h3>
        <div className={styles.notConnected}>
          <p>Please connect your wallet to view stake information.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Stake Information</h3>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading stake information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Stake Information</h3>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={handleRefresh} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Stake Information</h3>
        <button
          onClick={handleRefresh}
          className={styles.refreshButton}
          disabled={isLoading}
          title="Refresh stake information"
        >
          <span className={styles.buttonIcon}>
            {isLoading ? (
              <span className={styles.spinnerIcon}>⟳</span>
            ) : (
              <span className={styles.refreshIcon}>🔄</span>
            )}
          </span>
          <span className={styles.buttonText}>
            {isLoading ? (
              <span className={styles.refreshingText}>Refreshing...</span>
            ) : (
              <span className={styles.refreshText}>Refresh</span>
            )}
          </span>
        </button>
      </div>

      <div className={styles.content}>
        {stakeInfo ? (
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Staked Amount:</label>
              <span className={styles.value}>
                {formatTokenAmount(stakeInfo.stakedAmount)} tokens
              </span>
            </div>
            <div className={styles.infoItem}>
              <label>Staking Time:</label>
              <span className={styles.value}>
                {formatTimestamp(stakeInfo.stakingTimestamp)}
              </span>
            </div>
            <div className={styles.infoItem}>
              <label>Pending Reward:</label>
              <span className={styles.value}>
                {formatTokenAmount(stakeInfo.pendingReward)} tokens
              </span>
            </div>
            <div className={styles.infoItem}>
              <label>Claimed Reward:</label>
              <span className={styles.value}>
                {formatTokenAmount(stakeInfo.claimedReward)} tokens
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.noStake}>
            <p>No stake information available.</p>
          </div>
        )}
      </div>
    </div>
  );
});

StakeInfo.displayName = "StakeInfo";

export default StakeInfo;
