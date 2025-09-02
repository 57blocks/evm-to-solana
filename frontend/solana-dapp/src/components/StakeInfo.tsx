import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import styles from "../styles/StakeInfo.module.css";
import useUserStakeInfo from "@/hooks/useUserStakeInfo";
import { UserStakeInfo } from "@/hooks/useUserStakeInfo";
import { useProgram } from "@/hooks/useProgram";

export interface StakeInfoRef {
  refresh: () => void;
}

const StakeInfo = forwardRef<StakeInfoRef>((_, ref) => {
  const { publicKey, connected } = useWallet();
  const [stakeInfo, setStakeInfo] = useState<UserStakeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fetchUserStakeInfo } = useUserStakeInfo();
  const { program } = useProgram();

  const loadStakeInfo = useCallback(async () => {
    if (!publicKey || !program) return;

    setIsLoading(true);
    setError(null);

    try {
      const userStakeInfo = await fetchUserStakeInfo(publicKey);
      setStakeInfo(userStakeInfo ?? null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to load stake info: ${errorMessage}`);
      console.error("Error loading stake info:", err);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, fetchUserStakeInfo, program]);

  useEffect(() => {
    if (connected && publicKey && program) {
      void loadStakeInfo();
    } else {
      setStakeInfo(null);
      setError(null);
    }
  }, [connected, publicKey, program]);

  const handleRefresh = useCallback(async () => {
    if (!publicKey) {
      setError("Public key is not set");
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
              <span className={styles.value}>{stakeInfo.amount} tokens</span>
            </div>
            <div className={styles.infoItem}>
              <label>Staking Time:</label>
              <span className={styles.value}>{stakeInfo.stakeTimestamp}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Reward Debt:</label>
              <span className={styles.value}>
                {stakeInfo.rewardDebt} tokens
              </span>
            </div>
            <div className={styles.infoItem}>
              <label>Last Claim Time:</label>
              <span className={styles.value}>{stakeInfo.lastClaimTime}</span>
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
