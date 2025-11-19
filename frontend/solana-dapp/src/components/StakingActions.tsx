import React from "react";
import styles from "../styles/StakingActions.module.css";
import StakeTokens from "./StakeTokens";
import UnstakeTokens from "./UnstakeTokens";
import { ErrorInfo } from "./ErrorModal";

interface StakingActionsProps {
  onSuccess: () => void;
  onError: (errorInfo: ErrorInfo) => void;
}

const StakingActions: React.FC<StakingActionsProps> = ({
  onSuccess,
  onError,
}) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Staking Operations</h2>

      {/* Staking Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Stake Tokens</h3>
        <StakeTokens onSuccess={onSuccess} onError={onError} />
      </div>

      {/* Unstaking Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Unstake Tokens</h3>
        <UnstakeTokens onSuccess={onSuccess} onError={onError} />
      </div>
    </div>
  );
};

export default StakingActions;
