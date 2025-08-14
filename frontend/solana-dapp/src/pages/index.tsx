import type { NextPage } from "next";
import Head from "next/head";
import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import styles from "../styles/Home.module.css";
import StakingActions from "../components/StakingActions";
import RewardHistory from "../components/RewardHistory";
import StakeInfo, { StakeInfoRef } from "../components/StakeInfo";
import ErrorModal from "../components/ErrorModal";

const Home: NextPage = () => {
  const [globalErrorMessage, setGlobalErrorMessage] = useState<string | null>(
    null
  );
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // Mock connection state
  const stakeInfoRef = useRef<StakeInfoRef>(null);
  const queryClient = useQueryClient();

  const handleTransactionSuccess = useCallback(() => {
    // Refresh stake information immediately after successful transaction
    stakeInfoRef.current?.refresh();
    // Refresh reward history by invalidating the query
    queryClient.invalidateQueries({ queryKey: ["reward-history"] });
  }, [queryClient]);

  const clearGlobalError = useCallback(() => {
    setGlobalErrorMessage(null);
  }, []);

  const handleStake = async (amount: string) => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      // TODO: Implement actual Solana staking logic
      console.log("Staking amount:", amount);
    } catch (error) {
      console.error("Staking failed:", error);
    }
  };

  const handleUnstake = async (amount: string) => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      // TODO: Implement actual Solana unstaking logic
      console.log("Unstaking amount:", amount);
    } catch (error) {
      console.error("Unstaking failed:", error);
    }
  };

  const toggleConnection = () => {
    setIsConnected(!isConnected);
  };

  return (
    <div className={styles.container}>
      {/* Global Error Modal - displays in center of entire screen */}
      <ErrorModal
        errorMessage={globalErrorMessage}
        onClose={clearGlobalError}
      />

      {/* Global Loading Indicator */}
      {isGlobalLoading && (
        <div className={styles.globalLoadingOverlay}>
          <div className={styles.globalLoadingSpinner}>
            <div className={styles.spinner}></div>
            <p>Processing transaction...</p>
          </div>
        </div>
      )}

      <Head>
        <title>Solana Staking Platform</title>
        <meta
          content="A clean and modern Solana staking platform"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        {/* Header Section - Mock Wallet Connection */}
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>Solana Staking Platform</h1>
          <div className={styles.walletSection}>
            <button
              onClick={toggleConnection}
              className={styles.mockWalletButton}
            >
              {isConnected ? "Disconnect Wallet" : "Connect Wallet"}
            </button>
          </div>
        </header>

        {/* Show wallet connection message if not connected */}
        {!isConnected && (
          <div className={styles.walletMessage}>
            <div className={styles.messageCard}>
              <h2>Welcome to Solana Staking Platform</h2>
              <p>
                Please connect your Solana wallet to start staking and unstaking
                tokens.
              </p>
              <div className={styles.connectPrompt}>
                <button
                  onClick={toggleConnection}
                  className={styles.mockWalletButton}
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Section - Only show if wallet is connected */}
        {isConnected && (
          <div className={styles.contentGrid}>
            {/* Left Column - Stake Information */}
            <div className={styles.leftColumn}>
              <StakeInfo ref={stakeInfoRef} />
            </div>

            {/* Right Column - Staking Actions */}
            <div className={styles.rightColumn}>
              <StakingActions
                onStake={handleStake}
                onUnstake={handleUnstake}
                onTransactionSuccess={handleTransactionSuccess}
                onError={setGlobalErrorMessage}
              />
            </div>
          </div>
        )}

        {/* History Records Section - Only show if wallet is connected */}
        {isConnected && (
          <div className={styles.historySection}>
            <RewardHistory />
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
