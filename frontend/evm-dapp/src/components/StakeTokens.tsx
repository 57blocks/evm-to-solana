import React from "react";
import { useAccount } from "wagmi";
import { formatTokenAmount } from "../utils/tokenUtils";
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
    isApproving,
    isWaitingForWallet,
    currentAllowance,
    isStakingLoading,
    isApprovalLoading,
    isAllowanceLoading,
    approvalHash,
    stakeTransactionHash,
    isApprovalSuccess,
    setStakeAmount,
    handleStake,
    isDisabled,
  } = useStake(onTransactionSuccess, onError, onStakeTransactionStart);

  return (
    <div>
      {/* Show current allowance if connected */}
      {isConnected && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-4 text-center">
          {isAllowanceLoading ? (
            <p className="m-0 text-blue-700 font-medium text-sm">Loading allowance... ⏳</p>
          ) : currentAllowance && typeof currentAllowance === "bigint" ? (
            <p className="m-0 text-blue-700 font-medium text-sm">
              Current Allowance: {formatTokenAmount(currentAllowance)} tokens
            </p>
          ) : (
            <p className="m-0 text-blue-700 font-medium text-sm">Allowance not available</p>
          )}
        </div>
      )}

      {/* Show approval success message */}
      {isApprovalSuccess && !isApproving && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4 animate-in slide-in-from-top duration-300 relative">
          <div className="flex items-start gap-3 relative pr-8">
            <span className="text-lg flex-shrink-0 mt-0.5">✅</span>
            <p className="m-0 text-green-700 font-medium flex-1 break-words leading-relaxed">
              Approval successful! Automatically proceeding with staking...
            </p>
          </div>
        </div>
      )}

      {/* Show waiting for wallet confirmation message */}
      {isWaitingForWallet && approvalHash && !stakeTransactionHash && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4 text-center animate-in slide-in-from-top duration-300">
          <p className="m-0 text-yellow-700 font-medium text-sm flex items-center justify-center gap-2">
            ⏳ Waiting for wallet confirmation... Please check your wallet and
            confirm the approval transaction.
          </p>
        </div>
      )}

      {/* Show waiting for staking confirmation message */}
      {isWaitingForWallet && stakeTransactionHash && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4 text-center animate-in slide-in-from-top duration-300">
          <p className="m-0 text-yellow-700 font-medium text-sm flex items-center justify-center gap-2">
            ⏳ Waiting for wallet confirmation... Please check your wallet and
            confirm the staking transaction.
          </p>
        </div>
      )}

      {/* Show waiting for allowance update message */}
      {isApprovalSuccess &&
        !isApproving &&
        !isStakingLoading &&
        approvalHash && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4 text-center animate-in slide-in-from-top duration-300">
            <p className="m-0 text-blue-700 font-medium text-sm flex items-center justify-center gap-2">
              ⏳ Approval successful! Waiting for allowance to update on
              blockchain...
            </p>
          </div>
        )}

      <div className="flex flex-col gap-4">
        <input
          type="number"
          min="0"
          step="1"
          value={stakeAmount}
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
              : isApprovalLoading || isStakingLoading
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md cursor-wait hover:transform-none hover:shadow-md"
              : "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md hover:from-green-600 hover:to-green-700 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          }`}
        >
          {isApprovalLoading ? (
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
