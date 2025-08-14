import React from "react";
import styles from "../styles/StakingActions.module.css";
import StakeTokens from "./StakeTokens";
import UnstakeTokens from "./UnstakeTokens";

interface StakingActionsProps {
  onStake: (amount: string) => void;
  onUnstake: (amount: string) => void;
  onTransactionSuccess?: () => void;
  onError: (message: string) => void;
}

const StakingActions: React.FC<StakingActionsProps> = ({
  onStake,
  onUnstake,
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
          onStake={onStake}
          onTransactionSuccess={onTransactionSuccess}
          onError={onError}
        />
      </div>

      {/* Unstaking Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Unstake Tokens</h3>
        <UnstakeTokens
          onUnstake={onUnstake}
          onTransactionSuccess={onTransactionSuccess}
          onError={onError}
        />
      </div>
    </div>
  );
};

export default StakingActions;
