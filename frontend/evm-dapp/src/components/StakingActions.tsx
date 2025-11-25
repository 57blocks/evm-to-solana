import React from "react";
import { useAccount } from "wagmi";
import StakeTokens from "./StakeTokens";
import UnstakeTokens from "./UnstakeTokens";

interface StakingActionsProps {
  onTransactionSuccess?: () => void;
  onError: (message: string) => void;
  onStakeTransactionStart?: (transactionHash: string) => void;
}

const StakingActions: React.FC<StakingActionsProps> = ({
  onTransactionSuccess,
  onError,
  onStakeTransactionStart,
}) => {
  const { isConnected } = useAccount();

  return (
    <div className="w-full max-w-full m-0 p-6 bg-white/95 rounded-2xl shadow-lg backdrop-blur-md border border-white/20 h-full min-h-[400px] flex flex-col">
      <h2 className="text-center mb-8 text-gray-800 text-2xl font-semibold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent pb-4 border-b border-black/10">
        Staking Operations
      </h2>

      {!isConnected && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-8 text-center">
          <p className="m-0 text-red-700 font-medium">⚠️ Please connect your wallet to perform staking operations</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 mb-0 flex-1">
        {/* Stake Section */}
        <div
          className={`relative bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-xl p-6 shadow-md transition-all duration-300 overflow-hidden ${
            !isConnected ? "opacity-60 bg-gray-50/50 border-gray-300/50" : "hover:-translate-y-0.5 hover:shadow-lg"
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#667eea] to-[#764ba2]"></div>
          <h3 className="m-0 mb-4 text-gray-800 text-lg font-semibold text-center bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            Stake Tokens
          </h3>
          <StakeTokens
            onTransactionSuccess={onTransactionSuccess}
            onError={onError}
            onStakeTransactionStart={onStakeTransactionStart}
          />
        </div>

        {/* Unstake Section */}
        <div
          className={`relative bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 rounded-xl p-6 shadow-md transition-all duration-300 overflow-hidden ${
            !isConnected ? "opacity-60 bg-gray-50/50 border-gray-300/50" : "hover:-translate-y-0.5 hover:shadow-lg"
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#667eea] to-[#764ba2]"></div>
          <h3 className="m-0 mb-4 text-gray-800 text-lg font-semibold text-center bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            Unstake Tokens
          </h3>
          <UnstakeTokens
            onTransactionSuccess={onTransactionSuccess}
            onError={onError}
          />
        </div>
      </div>
    </div>
  );
};

export default StakingActions;
