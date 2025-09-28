import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useStakeByAlt } from "../hooks/useStakeByLookupTable";
import { useTransactionRetry } from "../hooks/useTransactionRetry";
import { usePriorityFee } from "../hooks/usePriorityFee";
import styles from "../styles/StakingDemos.module.css";

interface StakingDemosProps {
  onTransactionSuccess?: () => void;
}

export const StakingDemos: React.FC<StakingDemosProps> = ({
  onTransactionSuccess,
}) => {
  const { publicKey } = useWallet();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const handleTransactionSuccess = () => {
    setToastMessage("🎉 ALT stake transaction successful!");
    setToastType("success");
    setShowToast(true);

    // Call the parent's onTransactionSuccess to refresh StakeInfo
    if (onTransactionSuccess) {
      onTransactionSuccess();
    }
  };

  const handleError = (message: string) => {
    setToastMessage(`❌ ${message}`);
    setToastType("error");
    setShowToast(true);
  };

  const {
    isStaking,
    error,
    transactionSignature,
    lookupTableAddress,
    setStakeAmount,
    handleStake,
    resetError,
    isDisabled,
  } = useStakeByAlt(handleTransactionSuccess, handleError);

  // Transaction retry demo
  const { executeStakeTransaction } = useTransactionRetry();
  const [retryResult, setRetryResult] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Priority fee demo
  const {
    computeUnits,
    computeUnitPrice,
    handleStake: handlePriorityStake,
    totalFee,
  } = usePriorityFee();
  const [priorityResult, setPriorityResult] = useState<string | null>(null);
  const [isPriorityStaking, setIsPriorityStaking] = useState(false);

  // Shared stake amount
  const [sharedStakeAmount, setSharedStakeAmount] = useState("1");

  // Sync shared stake amount with useStakeByAlt hook on mount
  useEffect(() => {
    setStakeAmount(sharedStakeAmount);
  }, [setStakeAmount]);

  const handleRetryDemo = async () => {
    try {
      setRetryResult(null);
      setIsRetrying(true);

      // Use the new error handling callback for toast notifications
      const result = await executeStakeTransaction(
        sharedStakeAmount,
        (errorMessage) => {
          setToastMessage(`❌ ${errorMessage}`);
          setToastType("error");
          setShowToast(true);
        }
      );

      // Check if transaction was successful
      if (result) {
        setRetryResult(result);
        setToastMessage("🎉 Retry stake successful!");
        setToastType("success");
        setShowToast(true);

        // Call the parent's onTransactionSuccess to refresh StakeInfo
        if (onTransactionSuccess) {
          onTransactionSuccess();
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setToastMessage(`❌ Retry failed: ${errorMessage}`);
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsRetrying(false);
    }
  };

  const handlePriorityDemo = async () => {
    try {
      setPriorityResult(null);
      setIsPriorityStaking(true);
      const result = await handlePriorityStake(sharedStakeAmount);
      setPriorityResult(result);
      setToastMessage("🎉 Priority fee stake successful!");
      setToastType("success");
      setShowToast(true);

      // Call the parent's onTransactionSuccess to refresh StakeInfo
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setToastMessage(`❌ Priority fee stake failed: ${errorMessage}`);
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsPriorityStaking(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>🚀 Solana Staking Demos</h2>
        <p className={styles.subtitle}>
          Test different staking strategies: ALT optimization, retry logic, and
          priority fees
        </p>
      </div>

      <div className={styles.content}>
        {/* Shared Input */}
        <div className={styles.inputSection}>
          <div className={styles.inputGroup}>
            <input
              type="number"
              min="1"
              step="1"
              value={sharedStakeAmount}
              onChange={(e) => {
                const value = e.target.value;
                if (
                  value === "" ||
                  (parseInt(value) >= 1 &&
                    !value.includes(".") &&
                    !value.includes(","))
                ) {
                  setSharedStakeAmount(value);
                  setStakeAmount(value); // Sync with useStakeByAlt hook
                }
              }}
              placeholder="Enter stake amount"
              className={styles.input}
              disabled={!publicKey}
            />
            <span className={styles.inputLabel}>tokens</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionGrid}>
          {/* ALT Stake */}
          <div className={styles.actionCard}>
            <h3 className={styles.actionTitle}>🚀 ALT Stake</h3>
            <p className={styles.actionDesc}>80% fee reduction</p>
            <button
              onClick={handleStake}
              disabled={isDisabled || !sharedStakeAmount}
              className={`${styles.actionButton} ${styles.altButton} ${
                isStaking ? styles.loading : ""
              }`}
            >
              {isStaking ? (
                <>
                  <span className={styles.spinner}></span>
                  Staking...
                </>
              ) : (
                "Stake with ALT"
              )}
            </button>
          </div>

          {/* Retry Stake */}
          <div className={styles.actionCard}>
            <h3 className={styles.actionTitle}>🔄 Retry Stake</h3>
            <p className={styles.actionDesc}>Blockhash retry</p>
            <button
              onClick={handleRetryDemo}
              disabled={isRetrying || !sharedStakeAmount || !publicKey}
              className={`${styles.actionButton} ${styles.retryButton} ${
                isRetrying ? styles.loading : ""
              }`}
            >
              {isRetrying ? (
                <>
                  <span className={styles.spinner}></span>
                  Retrying...
                </>
              ) : (
                "Stake with Retry"
              )}
            </button>
          </div>

          {/* Priority Fee Stake */}
          <div className={styles.actionCard}>
            <h3 className={styles.actionTitle}>⚡ Priority Stake</h3>
            <p className={styles.actionDesc}>{totalFee.toFixed(6)} SOL</p>
            <button
              onClick={handlePriorityDemo}
              disabled={isPriorityStaking || !sharedStakeAmount || !publicKey}
              className={`${styles.actionButton} ${styles.priorityButton} ${
                isPriorityStaking ? styles.loading : ""
              }`}
            >
              {isPriorityStaking ? (
                <>
                  <span className={styles.spinner}></span>
                  Staking...
                </>
              ) : (
                "Stake with Priority"
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className={styles.resultsGrid}>
          {(transactionSignature || lookupTableAddress) && (
            <div className={styles.resultCard}>
              <h4 className={styles.resultTitle}>🚀 ALT Result</h4>
              {lookupTableAddress && (
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>ALT Address:</span>
                  <span className={styles.resultValue}>
                    {lookupTableAddress}
                  </span>
                </div>
              )}
              {transactionSignature && (
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Signature:</span>
                  <span className={styles.resultValue}>
                    {transactionSignature}
                  </span>
                </div>
              )}
            </div>
          )}

          {retryResult && (
            <div className={styles.resultCard}>
              <h4 className={styles.resultTitle}>🔄 Retry Result</h4>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Signature:</span>
                <span className={styles.resultValue}>{retryResult}</span>
              </div>
            </div>
          )}

          {priorityResult && (
            <div className={styles.resultCard}>
              <h4 className={styles.resultTitle}>⚡ Priority Result</h4>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Signature:</span>
                <span className={styles.resultValue}>{priorityResult}</span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Fee:</span>
                <span className={styles.resultValue}>
                  {computeUnitPrice} μSOL × {computeUnits.toLocaleString()} CU
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className={styles.error}>
            <span className={styles.errorText}>{error}</span>
            <button onClick={resetError} className={styles.errorClose}>
              ×
            </button>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className={`${styles.toast} ${styles[toastType]}`}>
          <span className={styles.toastMessage}>{toastMessage}</span>
          <button
            className={styles.toastClose}
            onClick={() => setShowToast(false)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
