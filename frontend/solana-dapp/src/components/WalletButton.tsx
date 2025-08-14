import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import styles from "../styles/WalletButton.module.css";

const WalletButton = () => {
  const { connected, publicKey, wallet, disconnect } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      setLoading(true);
      connection
        .getBalance(publicKey)
        .then((lamports) => {
          setBalance(lamports / LAMPORTS_PER_SOL);
        })
        .catch((error) => {
          console.error("Error fetching balance:", error);
          setBalance(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setBalance(null);
    }
  }, [connected, publicKey, connection]);

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const copyAddress = async () => {
    if (publicKey) {
      try {
        await navigator.clipboard.writeText(publicKey.toBase58());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy address:", err);
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = publicKey.toBase58();
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (!connected) {
    return (
      <WalletModalProvider>
        <WalletMultiButton className={styles.connectButton}>
          Connect Wallet
        </WalletMultiButton>
      </WalletModalProvider>
    );
  }

  return (
    <div className={styles.walletContainer}>
      <button className={styles.walletButton} onClick={toggleDropdown}>
        <div className={styles.walletInfo}>
          <span className={styles.walletName}>
            {wallet?.adapter.name || "Wallet"}
          </span>
          <span className={styles.walletAddress}>
            {publicKey?.toBase58().slice(0, 4)}...
            {publicKey?.toBase58().slice(-4)}
          </span>
        </div>
        <div className={styles.dropdownArrow}>▼</div>
      </button>

      {showDropdown && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>Wallet Connected</span>
          </div>

          <div className={styles.dropdownItem}>
            <span className={styles.itemLabel}>Address:</span>
            <span className={styles.itemValue}>
              {publicKey?.toBase58().slice(0, 8)}...
              {publicKey?.toBase58().slice(-8)}
            </span>
          </div>

          <div className={styles.dropdownItem}>
            <span className={styles.itemLabel}>Balance:</span>
            <span className={styles.itemValue}>
              {loading
                ? "Loading..."
                : balance !== null
                ? `${balance.toFixed(4)} SOL`
                : "N/A"}
            </span>
          </div>

          <div className={styles.dropdownDivider}></div>

          <button className={styles.copyButton} onClick={copyAddress}>
            {copied ? "✓ Copied!" : "📋 Copy Address"}
          </button>

          <button
            className={styles.disconnectButton}
            onClick={handleDisconnect}
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {showDropdown && (
        <div
          className={styles.overlay}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default WalletButton;
