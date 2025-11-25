import { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import StakingActions from "../components/StakingActions";
import StakeInfo, { StakeInfoRef } from "../components/StakeInfo";
import { StakingOptimizations } from "../components/StakingOptimizations";
import ErrorModal, { ErrorInfo } from "../components/ErrorModal";
import SuccessToast from "../components/StakeSuccessToast";
import { useStakeEvents } from "../hooks/useStakeEvents";
import { useAutoSignOnConnect } from "../hooks/useAutoSignOnConnect";
import WalletConnect from "@/components/WalletConnect";

const Home = () => {
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const { connected, publicKey } = useWallet();
  const stakeInfoRef = useRef<StakeInfoRef>(null);
  // Monitor stake events
  const { latestStakeEvent, clearLatestStakeEvent } = useStakeEvents({
    userAddress: publicKey,
    isConnected: connected,
  });

  // Auto sign message on wallet connect
  useAutoSignOnConnect(setErrorInfo);

  const handleOnSuccess = () => {
    // Refresh stake information immediately after successful transaction
    stakeInfoRef.current?.refresh();
  };

  const clearGlobalError = () => {
    setErrorInfo(null);
  };

  const clearStakeEvent = () => {
    clearLatestStakeEvent();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] px-4 sm:px-8">
      {/* Global Error Modal */}
      {errorInfo && (
        <ErrorModal
          message={errorInfo.message}
          title={errorInfo.title || "Error"}
          onClose={clearGlobalError}
        />
      )}

      <main className="min-h-screen py-8 flex flex-col items-center max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <header className="w-full max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-12 p-6 bg-white/95 rounded-2xl shadow-xl backdrop-blur-sm relative z-[10002]">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            Solana Staking Platform - ALT & Priority Fee Demos
          </h1>
          <div className="flex items-center">
            <WalletConnect />
          </div>
        </header>

        {/* Wallet connection message */}
        {!connected && (
          <div className="w-full max-w-2xl mx-auto px-4">
            <div className="bg-white/95 rounded-2xl p-12 text-center shadow-xl backdrop-blur-sm border border-white/20">
              <h2 className="text-3xl font-semibold text-gray-900 mb-4">
                Welcome to Solana Staking Platform
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Please connect your Solana wallet to start staking and unstaking
                tokens.
              </p>
              <div className="flex justify-center mt-6">
                <WalletConnect />
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Connected */}
        {connected && (
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
            {/* Left Column - Stake Information */}
            <div className="flex flex-col h-full">
              <StakeInfo ref={stakeInfoRef} />
            </div>

            {/* Right Column - Staking Actions */}
            <div className="flex flex-col h-full">
              <StakingActions
                onSuccess={handleOnSuccess}
                onError={setErrorInfo}
              />
            </div>
          </div>
        )}

        {/* Staking Optimizations */}
        {connected && (
          <div className="w-full max-w-6xl px-4 mt-8">
            <StakingOptimizations
              onSuccess={handleOnSuccess}
              onError={setErrorInfo}
            />
          </div>
        )}
      </main>

      {/* Success Toast */}
      <SuccessToast stakeEvent={latestStakeEvent} onClose={clearStakeEvent} />
    </div>
  );
};

export default Home;
