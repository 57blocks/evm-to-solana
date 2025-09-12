import React from "react";
import styles from "../styles/StakingActions.module.css";
import { useAccount } from "wagmi";
import { formatTokenAmount } from "../utils/tokenUtils";
import { useStakeEvents } from "../hooks/useStakeEvents";
import { useStake } from "../hooks/useStake";

interface StakeTokensProps {
  onTransactionSuccess?: () => void;
  onError: (message: string) => void;
}

const StakeTokens: React.FC<StakeTokensProps> = ({
  onTransactionSuccess,
  onError,
}) => {
  const { address, isConnected } = useAccount();

  // Use custom hooks
  const {
    stakeAmount,
    isApproving,
    isWaitingForWallet,
    currentAllowance,
    isStakingLoading,
    isApprovalLoading,
    isAllowanceLoading,
    approvalHash,
    stakeTransactionHash,
    isApprovalSuccess,
    setStakeAmount,
    handleStake,
    isDisabled,
  } = useStake(onTransactionSuccess, onError);

  const { latestStakeEvent, clearLatestStakeEvent } = useStakeEvents({
    userAddress: address,
    isConnected,
    currentTransactionHash: stakeTransactionHash,
  });

  return (
    <div>
      {/* Show current allowance if connected */}
      {isConnected && (
        <div className={styles.allowanceInfo}>
          {isAllowanceLoading ? (
            <p>Loading allowance... ⏳</p>
          ) : currentAllowance && typeof currentAllowance === "bigint" ? (
            <p>
              Current Allowance: {formatTokenAmount(currentAllowance)} tokens
            </p>
          ) : (
            <p>Allowance not available</p>
          )}
        </div>
      )}

      {/* Show approval success message */}
      {isApprovalSuccess && !isApproving && (
        <div className={styles.successMessage}>
          <p>
            ✅ Approval successful! Automatically proceeding with staking...
          </p>
        </div>
      )}

      {/* Show waiting for wallet confirmation message */}
      {isWaitingForWallet && approvalHash && !stakeTransactionHash && (
        <div className={styles.walletConfirmationMessage}>
          <p>
            ⏳ Waiting for wallet confirmation... Please check your wallet and
            confirm the approval transaction.
          </p>
        </div>
      )}

      {/* Show waiting for staking confirmation message */}
      {isWaitingForWallet && stakeTransactionHash && (
        <div className={styles.walletConfirmationMessage}>
          <p>
            ⏳ Waiting for wallet confirmation... Please check your wallet and
            confirm the staking transaction.
          </p>
        </div>
      )}

      {/* Show waiting for allowance update message */}
      {isApprovalSuccess &&
        !isApproving &&
        !isStakingLoading &&
        approvalHash && (
          <div className={styles.allowanceUpdateMessage}>
            <p>
              ⏳ Approval successful! Waiting for allowance to update on
              blockchain...
            </p>
          </div>
        )}

      {/* Show latest stake event info */}
      {latestStakeEvent && (
        <div className={styles.eventInfo}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h4>📊 Latest Stake Event</h4>
            <button
              onClick={clearLatestStakeEvent}
              className={styles.clearEventButton}
              title="Clear event display"
            >
              ✕
            </button>
          </div>
          <div className={styles.eventDetails}>
            <p>
              <strong>User:</strong> {latestStakeEvent.user}
            </p>
            <p>
              <strong>Amount:</strong>{" "}
              {formatTokenAmount(latestStakeEvent.amount)} tokens
            </p>
            <p>
              <strong>Block:</strong> {latestStakeEvent.blockNumber.toString()}
            </p>
            <p>
              <strong>Transaction:</strong>{" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${latestStakeEvent.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.transactionLink}
              >
                {latestStakeEvent.transactionHash.slice(0, 10)}...
                {latestStakeEvent.transactionHash.slice(-8)}
              </a>
            </p>
          </div>
        </div>
      )}

      <div className={styles.inputGroup}>
        <input
          type="number"
          min="0"
          step="1"
          value={stakeAmount}
          onChange={(e) => {
            const value = e.target.value;
            // Only allow positive integers or empty string
            if (
              value === "" ||
              (parseInt(value) >= 0 &&
                !value.includes(".") &&
                !value.includes(","))
            ) {
              setStakeAmount(value);
            }
          }}
          placeholder={
            isConnected
              ? "Enter stake amount (1 = 1 token)"
              : "Connect wallet first"
          }
          className={styles.input}
          disabled={isDisabled}
        />
        <button
          onClick={handleStake}
          disabled={!stakeAmount || isDisabled || parseInt(stakeAmount) <= 0}
          className={`${styles.button} ${styles.stakeButton} ${
            isDisabled ? styles.disabledButton : ""
          } ${
            isApprovalLoading || isStakingLoading ? styles.loadingButton : ""
          }`}
        >
          {isApprovalLoading ? (
            <>
              <span className={styles.buttonSpinner}>⟳</span>
              Approving...
            </>
          ) : isStakingLoading ? (
            <>
              <span className={styles.buttonSpinner}>⟳</span>
              Staking...
            </>
          ) : (
            "Stake"
          )}
        </button>
      </div>
    </div>
  );
};

export default StakeTokens;
