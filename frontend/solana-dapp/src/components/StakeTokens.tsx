import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import styles from "../styles/StakingActions.module.css";
import { useStake } from "../hooks/useStake";
import { ErrorInfo } from "./ErrorModal";
import { TokenAmountInput } from "./TokenAmountInput";
import { ActionButton } from "./ActionButton";

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
        <ActionButton
          onClick={handleStake}
          disabled={!stakeAmount || isDisabled || parseInt(stakeAmount) <= 0}
          isLoading={isStaking}
          loadingText="Staking..."
          spinnerType="char"
          variant="default"
          className={styles.stakeButton}
        >
          Stake
        </ActionButton>
      </div>
    </div>
  );
};

export default StakeTokens;
