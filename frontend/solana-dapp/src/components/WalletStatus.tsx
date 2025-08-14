import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import styles from '../styles/WalletStatus.module.css';

const WalletStatus: React.FC = () => {
  const { connected, publicKey, wallet } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      setLoading(true);
      connection.getBalance(publicKey)
        .then((lamports) => {
          setBalance(lamports / LAMPORTS_PER_SOL);
        })
        .catch((error) => {
          console.error('Error fetching balance:', error);
          setBalance(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setBalance(null);
    }
  }, [connected, publicKey, connection]);

  if (!connected) {
    return null;
  }

  return (
    <div className={styles.walletStatus}>
      <div className={styles.statusHeader}>
        <h3>Wallet Connected</h3>
        <div className={styles.walletInfo}>
          <span className={styles.walletName}>
            {wallet?.adapter.name || 'Unknown Wallet'}
          </span>
        </div>
      </div>
      
      <div className={styles.walletDetails}>
        <div className={styles.addressSection}>
          <label>Address:</label>
          <span className={styles.address}>
            {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
          </span>
        </div>
        
        <div className={styles.balanceSection}>
          <label>Balance:</label>
          <span className={styles.balance}>
            {loading ? 'Loading...' : balance !== null ? `${balance.toFixed(4)} SOL` : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WalletStatus; 