import React from "react";
import styles from "../styles/ErrorModal.module.css";

interface ErrorModalProps {
  errorMessage: string | null;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ errorMessage, onClose }) => {
  if (!errorMessage) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Error</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.errorText}>{errorMessage}</p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.okButton} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
