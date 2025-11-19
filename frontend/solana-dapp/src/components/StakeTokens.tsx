import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import styles from "../styles/StakingActions.module.css";
import { useStake } from "../hooks/useStake";
import { ErrorInfo } from "./ErrorModal";
import { TokenAmountInput } from "./TokenAmountInput";

interface StakeTokensProps {
  onSuccess: () => void;
  onError: (errorInfo: ErrorInfo) => void;
}

const StakeTokens: React.FC<StakeTokensProps> = ({ onSuccess, onError }) => {
  const { connected } = useWallet();

  // Use custom hook
  const { stakeAmount, isStaking, setStakeAmount, handleStake, isDisabled } =
    useStake(onSuccess, onError);

  return (
    <div>
      <div className={styles.inputGroup}>
        <TokenAmountInput
          value={stakeAmount}
          onChange={setStakeAmount}
          placeholder={
            connected
              ? "Enter stake amount (1 = 1 token)"
              : "Connect wallet first"
          }
          disabled={isDisabled}
          min={0}
          connected={connected}
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
