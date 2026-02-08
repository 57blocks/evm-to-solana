import { useState, useRef } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import StakingActions from "./components/StakingActions";
import StakeInfo, { StakeInfoRef } from "./components/StakeInfo";
import RewardHistory from "./components/RewardHistory";
import ErrorModal from "./components/ErrorModal";
import GlobalToast, { StakeEventData } from "./components/GlobalToast";
import { useStakeEvents, StakeEventState } from "./hooks/useStakeEvents";

const App: React.FC = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { isConnected, address } = useAccount();
  const stakeInfoRef = useRef<StakeInfoRef>(null);
  const [currentTransactionHash, setCurrentTransactionHash] = useState<
    string | null
  >(null);

  // Monitor stake events
  const { latestStakeEvent, clearLatestStakeEvent } = useStakeEvents({
    userAddress: address,
    isConnected,
    currentTransactionHash: currentTransactionHash as `0x${string}` | null,
  });

  // Convert StakeEventState to StakeEventData for GlobalToast
  const toastEvent: StakeEventData | null = latestStakeEvent
    ? {
        user: latestStakeEvent.user,
        amount: latestStakeEvent.amount,
        blockNumber: latestStakeEvent.blockNumber,
        transactionHash: latestStakeEvent.transactionHash,
      }
    : null;

  const handleOnSuccess = () => {
    stakeInfoRef.current?.refresh();
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
  };

  const handleStakeTransactionStart = (transactionHash: string) => {
    setCurrentTransactionHash(transactionHash);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] px-4 sm:px-8">
      {/* Global Error Modal */}
      <ErrorModal
        errorMessage={errorMessage}
        onClose={() => setErrorMessage(null)}
      />

      {/* Global Toast for Stake Events */}
      <GlobalToast
        stakeEvent={toastEvent}
        onClose={clearLatestStakeEvent}
      />

      <main className="min-h-screen py-8 flex flex-col items-center max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <header className="w-full max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-12 p-6 bg-white/95 rounded-2xl shadow-xl backdrop-blur-sm">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            EVM Staking Platform
          </h1>
          <ConnectButton />
        </header>

        {/* Wallet connection message */}
        {!isConnected && (
          <div className="w-full max-w-2xl mx-auto px-4">
            <div className="bg-white/95 rounded-2xl p-12 text-center shadow-xl backdrop-blur-sm border border-white/20">
              <h2 className="text-3xl font-semibold text-gray-900 mb-4">
                Welcome to EVM Staking Platform
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Please connect your wallet to start staking and unstaking
                tokens.
              </p>
              <div className="flex justify-center mt-6">
                <ConnectButton />
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Connected */}
        {isConnected && (
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
            {/* Left Column - Stake Information */}
            <div className="flex flex-col h-full">
              <StakeInfo ref={stakeInfoRef} />
            </div>

            {/* Right Column - Staking Actions */}
            <div className="flex flex-col h-full">
              <StakingActions
                onTransactionSuccess={handleOnSuccess}
                onError={handleError}
                onStakeTransactionStart={handleStakeTransactionStart}
              />
            </div>
          </div>
        )}

        {/* Reward History */}
        {isConnected && (
          <div className="w-full max-w-6xl px-4 mt-8">
            <RewardHistory />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
