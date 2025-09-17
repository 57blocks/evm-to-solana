import React from "react";
import styles from "../styles/GlobalToast.module.css";
import { formatTokenAmount } from "../utils/tokenUtils";

export interface StakeEventData {
  user: string;
  amount: bigint;
  slot: number;
  transactionSignature: string;
}

interface GlobalToastProps {
  stakeEvent: StakeEventData | null;
  onClose: () => void;
}

const GlobalToast: React.FC<GlobalToastProps> = ({ stakeEvent, onClose }) => {
  if (!stakeEvent) return null;

  return (
    <div className={styles.toastOverlay} onClick={onClose}>
      <div className={styles.toast} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className={styles.closeButton} title="Close">
          ✕
        </button>

        <div className={styles.content}>
          <div className={styles.title}>
            <span className={styles.icon}>✅</span>
            <span>Stake Successful!</span>
          </div>

          <div className={styles.amount}>
            <div className={styles.amountLabel}>Amount Staked</div>
            <div className={styles.amountValue}>
              {formatTokenAmount(stakeEvent.amount)} tokens
            </div>
          </div>

          <div className={styles.actions}>
            <a
              href={`https://explorer.solana.com/tx/${stakeEvent.transactionSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              View on Solana Explorer
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalToast;
