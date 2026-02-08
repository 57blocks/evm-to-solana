import React from "react";
import { useAccount } from "wagmi";
import { useStake } from "../hooks/useStake";

interface StakeTokensProps {
  onTransactionSuccess?: () => void;
  onError: (message: string) => void;
  onStakeTransactionStart?: (transactionHash: string) => void;
}

const StakeTokens: React.FC<StakeTokensProps> = ({
  onTransactionSuccess,
  onError,
  onStakeTransactionStart,
}) => {
  const { isConnected } = useAccount();

  // Use custom hooks
  const {
    stakeAmount,
    isWaitingForWallet,
    isApproving,
    isStakingLoading,
    stakeTransactionHash,
    setStakeAmount,
    handleStake,
    isDisabled,
  } = useStake(onTransactionSuccess, onError, onStakeTransactionStart);

  return (
    <div>
      {/* Show approving message */}
      {isApproving && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4 text-center animate-in slide-in-from-top duration-300">
          <p className="m-0 text-blue-700 font-medium text-sm flex items-center justify-center gap-2">
            {isWaitingForWallet
              ? "⏳ Please confirm the approval in your wallet..."
              : "⏳ Approval submitted. Waiting for confirmation..."}
          </p>
        </div>
      )}

      {/* Show waiting for wallet confirmation for staking */}
      {!isApproving && isWaitingForWallet && !stakeTransactionHash && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4 text-center animate-in slide-in-from-top duration-300">
          <p className="m-0 text-yellow-700 font-medium text-sm flex items-center justify-center gap-2">
            ⏳ Please confirm the staking transaction in your wallet...
          </p>
        </div>
      )}

      {/* Show staking in progress message */}
      {!isApproving && stakeTransactionHash && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4 text-center animate-in slide-in-from-top duration-300">
          <p className="m-0 text-yellow-700 font-medium text-sm flex items-center justify-center gap-2">
            ⏳ Staking transaction submitted. Waiting for confirmation...
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <input
          type="number"
          min="0"
          step="1"
          value={stakeAmount}
          onKeyDown={(e) => {
            // Block e, E, +, -, . which are allowed by type="number"
            if (["e", "E", "+", "-", "."].includes(e.key)) {
              e.preventDefault();
            }
          }}
          onChange={(e) => {
            const value = e.target.value;
            // Only allow positive integers or empty string
            if (
              value === "" ||
              (parseInt(value) >= 0 &&
                !value.includes(".") &&
                !value.includes(","))
            ) {
              setStakeAmount(value);
            }
          }}
          placeholder={
            isConnected
              ? "Enter stake amount (1 = 1 token)"
              : "Connect wallet first"
          }
          className="px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-colors duration-200 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-300"
          disabled={isDisabled}
        />
        <button
          onClick={handleStake}
          disabled={!stakeAmount || isDisabled || parseInt(stakeAmount) <= 0}
          className={`px-6 py-3 border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 uppercase tracking-wider relative overflow-hidden ${
            isDisabled
              ? "bg-gray-400 text-gray-600 cursor-not-allowed transform-none shadow-none hover:bg-gray-400 hover:transform-none hover:shadow-none"
              : isApproving || isStakingLoading
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md cursor-wait hover:transform-none hover:shadow-md"
              : "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md hover:from-green-600 hover:to-green-700 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          }`}
        >
          {isApproving ? (
            <>
              <span className="inline-block animate-spin mr-2">⟳</span>
              Approving...
            </>
          ) : isStakingLoading ? (
            <>
              <span className="inline-block animate-spin mr-2">⟳</span>
              Staking...
            </>
          ) : (
            "Stake"
          )}
        </button>
      </div>
    </div>
  );
};

export default StakeTokens;
