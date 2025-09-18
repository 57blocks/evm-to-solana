import type { NextPage } from "next";
import Head from "next/head";
import { useState, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import styles from "../styles/Home.module.css";
import StakingActions from "../components/StakingActions";
import StakeByLookupTable from "../components/StakeByLookupTable";
import StakeInfo, { StakeInfoRef } from "../components/StakeInfo";
import ErrorModal from "../components/ErrorModal";
import DynamicWalletButton from "../components/DynamicWalletButton";
import GlobalToast from "../components/GlobalToast";
import { useStakeEvents } from "../hooks/useStakeEvents";

const Home: NextPage = () => {
  const [globalErrorMessage, setGlobalErrorMessage] = useState<string | null>(
    null
  );
  const { connected, publicKey } = useWallet();
  const stakeInfoRef = useRef<StakeInfoRef>(null);
  const queryClient = useQueryClient();

  // Monitor stake events
  const { latestStakeEvent, clearLatestStakeEvent } = useStakeEvents({
    userAddress: publicKey || undefined,
    isConnected: connected,
  });

  const handleTransactionSuccess = useCallback(() => {
    // Refresh stake information immediately after successful transaction
    stakeInfoRef.current?.refresh();
  }, []);

  const clearGlobalError = useCallback(() => {
    setGlobalErrorMessage(null);
  }, []);

  const clearStakeEvent = useCallback(() => {
    clearLatestStakeEvent();
  }, [clearLatestStakeEvent]);

  return (
    <div className={styles.container}>
      {/* Global Error Modal - displays in center of entire screen */}
      <ErrorModal
        errorMessage={globalErrorMessage}
        onClose={clearGlobalError}
      />

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
                onTransactionSuccess={handleTransactionSuccess}
                onError={setGlobalErrorMessage}
              />
            </div>
          </div>
        )}

        {/* Lookup Table Staking Section - Only show if wallet is connected */}
        {connected && (
          <div className={styles.historySection}>
            <StakeByLookupTable
              onTransactionSuccess={handleTransactionSuccess}
              onError={setGlobalErrorMessage}
            />
          </div>
        )}
      </main>
      <GlobalToast stakeEvent={latestStakeEvent} onClose={clearStakeEvent} />
    </div>
  );
};

export default Home;
