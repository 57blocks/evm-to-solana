import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import Head from "next/head";
import { useState, useRef, useCallback } from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import styles from "../styles/Home.module.css";
import StakingActions from "../components/StakingActions";
import RewardHistory from "../components/RewardHistory";
import StakeInfo, { StakeInfoRef } from "../components/StakeInfo";
import ErrorModal from "../components/ErrorModal";
import "dotenv/config";

const Home: NextPage = () => {
  const [globalErrorMessage, setGlobalErrorMessage] = useState<string | null>(
    null
  );
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const { isConnected } = useAccount();
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
      // Add actual staking logic here
      // TODO: Implement actual staking contract interaction

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
      // Unstaking logic is now handled in UnstakeTokens component
      // TODO: This function is no longer needed as UnstakeTokens handles unstaking
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
        <title>Staking Platform</title>
        <meta
          content="A clean and modern staking platform"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        {/* Header Section - Wallet Connection */}
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>Staking Platform</h1>
          <div className={styles.walletSection}>
            <ConnectButton
              label="Connect Wallet"
              showBalance={false}
              accountStatus="address"
            />
          </div>
        </header>

        {/* Show wallet connection message if not connected */}
        {!isConnected && (
          <div className={styles.walletMessage}>
            <div className={styles.messageCard}>
              <h2>Welcome to Staking Platform</h2>
              <p>
                Please connect your wallet to start staking and unstaking
                tokens.
              </p>
              <div className={styles.connectPrompt}>
                <ConnectButton
                  label="Connect Wallet to Continue"
                  showBalance={false}
                  accountStatus="address"
                />
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
