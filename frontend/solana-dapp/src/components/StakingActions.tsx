import React from "react";
import styles from "../styles/StakingActions.module.css";
import StakeTokens from "./StakeTokens";
import UnstakeTokens from "./UnstakeTokens";

interface StakingActionsProps {
  onTransactionSuccess?: () => void;
  onError: (message: string) => void;
}

const StakingActions: React.FC<StakingActionsProps> = ({
  onTransactionSuccess,
  onError,
}) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Staking Operations</h2>

      {/* Staking Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Stake Tokens</h3>
        <StakeTokens
          onTransactionSuccess={onTransactionSuccess}
          onError={onError}
        />
      </div>

      {/* Unstaking Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Unstake Tokens</h3>
        <UnstakeTokens
          onTransactionSuccess={onTransactionSuccess}
          onError={onError}
        />
      </div>
    </div>
  );
};

export default StakingActions;
