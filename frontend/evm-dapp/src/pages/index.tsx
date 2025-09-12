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
import GlobalToast from "../components/GlobalToast";
import { useStakeEvents } from "../hooks/useStakeEvents";

const Home: NextPage = () => {
  const [globalErrorMessage, setGlobalErrorMessage] = useState<string | null>(
    null
  );
  const [currentStakeTransactionHash, setCurrentStakeTransactionHash] =
    useState<`0x${string}` | null>(null);
  const { isConnected, address } = useAccount();
  const stakeInfoRef = useRef<StakeInfoRef>(null);
  const queryClient = useQueryClient();

  // Monitor stake events for the current transaction
  const { latestStakeEvent, clearLatestStakeEvent } = useStakeEvents({
    userAddress: address,
    isConnected,
    currentTransactionHash: currentStakeTransactionHash,
  });

  const handleTransactionSuccess = useCallback(() => {
    // Refresh stake information immediately after successful transaction
    stakeInfoRef.current?.refresh();
    // Refresh reward history by invalidating the query
    queryClient.invalidateQueries({ queryKey: ["reward-history"] });
  }, [queryClient]);

  const handleStakeTransactionStart = useCallback((transactionHash: string) => {
    setCurrentStakeTransactionHash(transactionHash as `0x${string}`);
  }, []);

  const handleStakeComplete = useCallback(() => {
    // Clear the transaction hash after event is processed
    setCurrentStakeTransactionHash(null);
  }, []);

  const clearGlobalError = useCallback(() => {
    setGlobalErrorMessage(null);
  }, []);

  const clearStakeEvent = useCallback(() => {
    clearLatestStakeEvent();
    handleStakeComplete();
  }, [clearLatestStakeEvent, handleStakeComplete]);

  return (
    <div className={styles.container}>
      {/* Global Error Modal - displays in center of entire screen */}
      <ErrorModal
        errorMessage={globalErrorMessage}
        onClose={clearGlobalError}
      />

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
                onTransactionSuccess={handleTransactionSuccess}
                onError={setGlobalErrorMessage}
                onStakeTransactionStart={handleStakeTransactionStart}
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

      {/* Global Toast - Full Screen Overlay */}
      <GlobalToast stakeEvent={latestStakeEvent} onClose={clearStakeEvent} />
    </div>
  );
};

export default Home;
