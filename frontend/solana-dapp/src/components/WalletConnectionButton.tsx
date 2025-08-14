import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import styles from "../styles/WalletConnection.module.css";

const WalletConnectionButton: React.FC = () => {
  const { connected } = useWallet();

  return (
    <div className={styles.walletButtonContainer}>
      <WalletMultiButton className={styles.walletButton} />
    </div>
  );
};

export default WalletConnectionButton;
