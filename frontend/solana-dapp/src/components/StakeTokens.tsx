import React, { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import styles from "../styles/StakingActions.module.css";
import { convertToWei, validateTokenAmount } from "../utils/tokenUtils";

interface StakeTokensProps {
  onStake: (amount: string) => void;
  onTransactionSuccess?: () => void;
  onError: (message: string) => void;
}

const StakeTokens: React.FC<StakeTokensProps> = ({
  onStake,
  onTransactionSuccess,
  onError,
}) => {
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const stakeAmountRef = useRef("");
  const { connected, publicKey } = useWallet();

  const handleStake = async () => {
    if (!connected || !publicKey) {
      onError("Please connect your wallet first");
      return;
    }

    if (!stakeAmount || isStaking || isButtonClicked) {
      return;
    }

    // Validate input using utility function
    const validation = validateTokenAmount(stakeAmount);
    if (!validation.isValid) {
      onError(validation.error || "Invalid amount");
      return;
    }

    // Immediately disable button to prevent multiple clicks
    setIsButtonClicked(true);
    setIsStaking(true);

    try {
      // TODO: Implement actual Solana staking logic
      console.log("Staking amount:", stakeAmount);

      // Simulate transaction delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Call success callback
      onStake(stakeAmount);
      setStakeAmount("");
      stakeAmountRef.current = "";

      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
    } catch (error) {
      onError(
        `Failed to stake: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsStaking(false);
      setIsButtonClicked(false);
    }
  };

  const isDisabled = !connected || isStaking || isButtonClicked;

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
              stakeAmountRef.current = value;
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
