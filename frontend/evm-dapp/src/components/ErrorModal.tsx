import React from "react";
import styles from "../styles/ErrorModal.module.css";

interface ErrorModalProps {
  errorMessage: string | null;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ errorMessage, onClose }) => {
  if (!errorMessage) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.errorHeader}>
            <h3 className={styles.errorTitle}>Error</h3>
            <button
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
          <div className={styles.errorBody}>
            <p className={styles.errorText}>{errorMessage}</p>
          </div>
          <div className={styles.errorFooter}>
            <button onClick={onClose} className={styles.okButton}>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
