import type { NextPage } from "next";
import Head from "next/head";
import { useState, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import styles from "../styles/Home.module.css";
import StakingActions from "../components/StakingActions";
import StakeInfo, { StakeInfoRef } from "../components/StakeInfo";
import { StakingOptimizations } from "../components/StakingOptimizations";
import ErrorModal, { ErrorInfo } from "../components/ErrorModal";
import DynamicWalletButton from "../components/DynamicWalletButton";
import SuccessToast from "../components/StakeSuccessToast";
import { useStakeEvents } from "../hooks/useStakeEvents";
import { useAutoSignOnConnect } from "../hooks/useAutoSignOnConnect";

const Home: NextPage = () => {
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const { connected, publicKey } = useWallet();
  const stakeInfoRef = useRef<StakeInfoRef>(null);
  // Monitor stake events
  const { latestStakeEvent, clearLatestStakeEvent } = useStakeEvents({
    userAddress: publicKey,
    isConnected: connected,
  });
  const [isShowSuccessToast, setIsShowSuccessToast] = useState(false);

  // Auto sign message on wallet connect
  useAutoSignOnConnect(setErrorInfo);

  const handleOnSuccess = () => {
    // Refresh stake information immediately after successful transaction
    stakeInfoRef.current?.refresh();
    setIsShowSuccessToast(true);
  };

  const clearGlobalError = () => {
    setErrorInfo(null);
  };

  const clearStakeEvent = () => {
    clearLatestStakeEvent();
    setIsShowSuccessToast(false);
  };

  return (
    <div className={styles.container}>
      {/* Global Error Modal - displays in center of entire screen */}
      {errorInfo && (
        <ErrorModal
          message={errorInfo.message}
          title={errorInfo.title || "Error"}
          onClose={clearGlobalError}
        />
      )}

      <Head>
        <title>Solana Staking Platform - ALT & Priority Fee Demos</title>
        <meta
          content="Solana staking platform with separate ALT and Priority Fee optimization demos"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        {/* Header Section - Wallet Connection */}
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>
            Solana Staking Platform - ALT & Priority Fee Demos
          </h1>
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
                onSuccess={handleOnSuccess}
                onError={setErrorInfo}
              />
            </div>
          </div>
        )}

        {/* Staking Optimizations - Only show if wallet is connected */}
        {connected && (
          <div className={styles.historySection}>
            <StakingOptimizations
              onSuccess={handleOnSuccess}
              onError={setErrorInfo}
            />
          </div>
        )}
      </main>
      {isShowSuccessToast && (
        <SuccessToast stakeEvent={latestStakeEvent} onClose={clearStakeEvent} />
      )}
    </div>
  );
};

export default Home;
