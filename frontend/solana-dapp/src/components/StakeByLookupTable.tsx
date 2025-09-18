import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import styles from "../styles/StakingActions.module.css";
import lookupTableStyles from "../styles/StakeByLookupTable.module.css";
import { useStakeByAlt } from "../hooks/useStakeByLookupTable";

interface StakeByLookupTableProps {
  onTransactionSuccess?: () => void;
  onError: (message: string) => void;
}

const StakeByLookupTable: React.FC<StakeByLookupTableProps> = ({
  onTransactionSuccess,
  onError,
}) => {
  const { connected } = useWallet();

  // Use Address Lookup Table (ALT) stake hook
  const {
    stakeAmount,
    isStaking,
    setStakeAmount,
    handleStake,
    isDisabled,
    lookupTableAddress,
    error,
  } = useStakeByAlt(onTransactionSuccess, onError);

  return (
    <div>
      {/* Address Lookup Table (ALT) Info */}
      <div className={lookupTableStyles.lookupTableContainer}>
        <div className={lookupTableStyles.lookupTableTitle}>
          🔍 Address Lookup Table (ALT) Staking
        </div>
        <div className={lookupTableStyles.lookupTableFeature}>
          • <strong>Lower Fees:</strong> Reduce transaction costs by 20-40%
        </div>
        <div className={lookupTableStyles.lookupTableFeature}>
          • <strong>Faster:</strong> Optimized transaction processing
        </div>
        <div className={lookupTableStyles.lookupTableFeatureLast}>
          • <strong>Advanced:</strong> Uses Solana's Address Lookup Tables
          (ALTs)
        </div>

        {/* Input and Button inside the box */}
        <div className={lookupTableStyles.lookupTableInputGroup}>
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
              connected
                ? "Enter stake amount (1 = 1 token)"
                : "Connect wallet first"
            }
            className={lookupTableStyles.lookupTableInput}
            disabled={isDisabled}
          />
          <button
            onClick={handleStake}
            disabled={!stakeAmount || isDisabled || parseInt(stakeAmount) <= 0}
            className={`${lookupTableStyles.lookupTableButton} ${
              isDisabled ? styles.disabledButton : ""
            } ${isStaking ? lookupTableStyles.lookupTableButtonLoading : ""}`}
          >
            {isStaking ? (
              <>
                <span className={lookupTableStyles.lookupTableButtonSpinner}>
                  ⟳
                </span>
                Creating ALT...
              </>
            ) : (
              <>
                <span className={lookupTableStyles.buttonIcon}>🔍</span>
                Stake (ALT)
              </>
            )}
          </button>
        </div>

        {lookupTableAddress && (
          <div className={lookupTableStyles.lookupTableAddress}>
            📋 Active Address Lookup Table (ALT):{" "}
            {lookupTableAddress.slice(0, 8)}...
            {lookupTableAddress.slice(-8)}
            <div className={lookupTableStyles.lookupTableAddressText}>
              This table will be reused for future transactions
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className={lookupTableStyles.errorDisplay}>❌ {error}</div>
      )}

      {/* Process Steps Indicator */}
      {isStaking && (
        <div className={lookupTableStyles.processStepsIndicator}>
          <div className={lookupTableStyles.processStepsTitle}>
            🔄 Setting up Address Lookup Table (ALT) (2 signatures required):
          </div>
          <div className={lookupTableStyles.processStep}>
            <span className={lookupTableStyles.processStepNumber}>1.</span>{" "}
            Creating ALT and adding accounts...
          </div>
          <div className={lookupTableStyles.processStep}>
            <span className={lookupTableStyles.processStepNumber}>2.</span>{" "}
            Sending stake transaction...
          </div>
          <div className={lookupTableStyles.processStepsNote}>
            💡 This setup is only needed once. Future transactions will reuse
            the Address Lookup Table (ALT).
          </div>
        </div>
      )}
    </div>
  );
};

export default StakeByLookupTable;
