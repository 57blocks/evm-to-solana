import React, { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import styles from "../styles/StakingActions.module.css";
import { convertToLamports, validateTokenAmount } from "../utils/tokenUtils";
import { useUnstake } from "@/hooks/useUnstake";

interface UnstakeTokensProps {
  onUnstake: (amount: string) => void;
  onTransactionSuccess?: () => void;
  onError: (message: string) => void;
}

const UnstakeTokens: React.FC<UnstakeTokensProps> = ({
  onUnstake,
  onTransactionSuccess,
  onError,
}) => {
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const { unstake } = useUnstake();
  const unstakeAmountRef = useRef("");
  const { connected, publicKey } = useWallet();

  const handleUnstake = async () => {
    if (!connected || !publicKey) {
      onError("Please connect your wallet first");
      return;
    }

    if (!unstakeAmount || isUnstaking || isButtonClicked) {
      return;
    }

    // Validate input using utility function
    const validation = validateTokenAmount(unstakeAmount);
    if (!validation.isValid) {
      onError(validation.error || "Invalid amount");
      return;
    }

    // Immediately disable button to prevent multiple clicks
    setIsButtonClicked(true);
    setIsUnstaking(true);

    try {
      await unstake(convertToLamports(unstakeAmount).toString());

      // Call success callback
      onUnstake(unstakeAmount);
      setUnstakeAmount("");
      unstakeAmountRef.current = "";

      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
    } catch (error) {
      onError(
        `Failed to unstake: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsUnstaking(false);
      setIsButtonClicked(false);
    }
  };

  const isDisabled = !connected || isUnstaking || isButtonClicked;

  return (
    <div>
      <div className={styles.inputGroup}>
        <input
          type="number"
          min="0"
          step="1"
          value={unstakeAmount}
          onChange={(e) => {
            const value = e.target.value;
            // Only allow positive integers or empty string
            if (
              value === "" ||
              (parseInt(value) >= 0 &&
                !value.includes(".") &&
                !value.includes(","))
            ) {
              setUnstakeAmount(value);
              unstakeAmountRef.current = value;
            }
          }}
          placeholder={
            connected
              ? "Enter unstake amount (1 = 1 token)"
              : "Connect wallet first"
          }
          className={styles.input}
          disabled={isDisabled}
        />
        <button
          onClick={handleUnstake}
          disabled={
            !unstakeAmount || isDisabled || parseInt(unstakeAmount) <= 0
          }
          className={`${styles.button} ${styles.unstakeButton} ${
            isDisabled ? styles.disabledButton : ""
          } ${isUnstaking ? styles.loadingButton : ""}`}
        >
          {isUnstaking ? (
            <>
              <span className={styles.buttonSpinner}>⟳</span>
              Unstaking...
            </>
          ) : (
            "Unstake"
          )}
        </button>
      </div>
    </div>
  );
};

export default UnstakeTokens;
