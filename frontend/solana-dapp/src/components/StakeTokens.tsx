import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import styles from "../styles/StakingActions.module.css";
import { useStake } from "../hooks/useStake";

interface StakeTokensProps {
  onTransactionSuccess?: () => void;
  onError: (message: string) => void;
}

const StakeTokens: React.FC<StakeTokensProps> = ({
  onTransactionSuccess,
  onError,
}) => {
  const { connected } = useWallet();

  // Use custom hook
  const { stakeAmount, isStaking, setStakeAmount, handleStake, isDisabled } =
    useStake(onTransactionSuccess, onError);

  return (
    <div>
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
            connected
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
          } ${isStaking ? styles.loadingButton : ""}`}
        >
          {isStaking ? (
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
