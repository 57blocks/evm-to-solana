import type { NextPage } from "next";
import Head from "next/head";
import { useState, useRef, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import styles from "../styles/Home.module.css";
import StakingActions from "../components/StakingActions";
import RewardHistory from "../components/RewardHistory";
import StakeInfo, { StakeInfoRef } from "../components/StakeInfo";
import ErrorModal from "../components/ErrorModal";
import DynamicWalletButton from "../components/DynamicWalletButton";

const Home: NextPage = () => {
  const [globalErrorMessage, setGlobalErrorMessage] = useState<string | null>(
    null
  );
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const { connected } = useWallet();
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
    if (!connected) {
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
    if (!connected) {
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
        {/* Header Section - Wallet Connection */}
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>Solana Staking Platform</h1>
          <div className={styles.walletSection}>
            <DynamicWalletButton />
          </div>
        </header>

        {/* Show wallet connection message if not connected */}
        {!connected && (
          <div className={styles.walletMessage}>
            <div className={styles.messageCard}>
              <h2>Welcome to Solana Staking Platform</h2>
              <p>
                Please connect your Solana wallet to start staking and unstaking
                tokens.
              </p>
              <div className={styles.connectPrompt}>
                <DynamicWalletButton />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Section - Only show if wallet is connected */}
        {connected && (
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
        {connected && (
          <div className={styles.historySection}>
            <RewardHistory />
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
