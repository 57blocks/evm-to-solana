import React, { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import styles from "../styles/StakingActions.module.css";
import { validateTokenAmount } from "../utils/tokenUtils";
import { useUnstake } from "@/hooks/useUnstake";
import { formatErrorForDisplay } from "@/utils/programErrors";
import { ErrorInfo } from "./ErrorModal";
import { TokenAmountInput } from "./TokenAmountInput";

interface UnstakeTokensProps {
  onSuccess: () => void;
  onError: (errorInfo: ErrorInfo) => void;
}

const UnstakeTokens: React.FC<UnstakeTokensProps> = ({
  onSuccess,
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
      onError({ message: "Please connect your wallet first" });
      return;
    }

    if (!unstakeAmount || isUnstaking || isButtonClicked) {
      return;
    }

    // Validate input using utility function
    const validation = validateTokenAmount(unstakeAmount);
    if (!validation.isValid) {
      onError({ message: validation.error || "Invalid amount" });
      return;
    }

    // Immediately disable button to prevent multiple clicks
    setIsButtonClicked(true);
    setIsUnstaking(true);

    try {
      await unstake(unstakeAmount);

      setUnstakeAmount("");
      unstakeAmountRef.current = "";

      onSuccess && onSuccess();
    } catch (error) {
      onError({
        message: formatErrorForDisplay(error).message,
        title: formatErrorForDisplay(error).title,
      });
    } finally {
      setIsUnstaking(false);
      setIsButtonClicked(false);
    }
  };

  const isDisabled = !connected || isUnstaking || isButtonClicked;

  return (
    <div>
      <div className={styles.inputGroup}>
        <TokenAmountInput
          value={unstakeAmount}
          onChange={(value) => {
            setUnstakeAmount(value);
            unstakeAmountRef.current = value;
          }}
          placeholder={
            connected
              ? "Enter unstake amount (1 = 1 token)"
              : "Connect wallet first"
          }
          disabled={isDisabled}
          min={0}
          connected={connected}
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
