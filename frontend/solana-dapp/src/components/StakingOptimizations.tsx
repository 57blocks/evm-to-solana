import { useState } from "react";
import { ErrorInfo } from "./ErrorModal";
import { TokenAmountInput } from "./TokenAmountInput";
import { ActionButton } from "./ActionButton";
import { usePriorityFee } from "@/hooks/usePriorityFee";
import { useStakeByLookupTable } from "@/hooks/useStakeByLookupTable";
import { useJitoStake } from "@/hooks/useJitoStake";
import { useTransactionRetry } from "@/hooks/useTransactionRetry";

interface StakingOptimizationsProps {
  onSuccess: () => void;
  onError: (errorInfo: ErrorInfo) => void;
}

export const StakingOptimizations: React.FC<StakingOptimizationsProps> = ({
  onSuccess,
  onError,
}) => {
  const [priorityAmount, setPriorityAmount] = useState("");
  const [altAmount, setAltAmount] = useState("");
  const [jitoAmount, setJitoAmount] = useState("");
  const [retryAmount, setRetryAmount] = useState("");

  const parsedPriorityAmount = Number.parseInt(priorityAmount || "0", 10);
  const parsedAltAmount = Number.parseInt(altAmount || "0", 10);
  const parsedJitoAmount = Number.parseInt(jitoAmount || "0", 10);
  const parsedRetryAmount = Number.parseInt(retryAmount || "0", 10);

  const { handlePriorityStake } = usePriorityFee({
    onSuccess,
    onError,
    stakeAmount: parsedPriorityAmount,
  });

  const altStake = useStakeByLookupTable(
    parsedAltAmount,
    onSuccess,
    onError
  );

  const { executeJitoStake, isSubmitting: isJitoSubmitting } =
    useJitoStake({
      onSuccess,
      onError,
      stakeAmount: parsedJitoAmount,
    });

  const { executeStakeTransaction: executeRetryStake } = useTransactionRetry({
    onSuccess,
    onError,
    stakeAmount: parsedRetryAmount,
  });

  const handlePriorityClick = async () => {
    if (!parsedPriorityAmount || parsedPriorityAmount <= 0) {
      onError({ message: "Please enter a valid stake amount" });
      return;
    }
    await handlePriorityStake();
  };

  const handleJitoClick = async () => {
    if (!parsedJitoAmount || parsedJitoAmount <= 0) {
      onError({ message: "Please enter a valid stake amount" });
      return;
    }
    await executeJitoStake();
  };

  const handleRetryClick = async () => {
    if (!parsedRetryAmount || parsedRetryAmount <= 0) {
      onError({ message: "Please enter a valid stake amount" });
      return;
    }
    await executeRetryStake();
  };

  return (
    <div className="bg-white/95 rounded-2xl shadow-xl backdrop-blur-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Staking Optimizations
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/40">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Priority Fee Stake
          </h3>
          <div className="flex gap-3">
            <TokenAmountInput
              value={priorityAmount}
              onChange={setPriorityAmount}
              placeholder="Enter stake amount"
              min={0}
            />
            <ActionButton
              onClick={handlePriorityClick}
              isLoading={false}
              loadingText="Submitting..."
              className="min-w-[140px]"
              disabled={parsedPriorityAmount <= 0}
            >
              Stake (Priority)
            </ActionButton>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/40">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            ALT Stake
          </h3>
          <div className="flex gap-3">
            <TokenAmountInput
              value={altAmount}
              onChange={setAltAmount}
              placeholder="Enter stake amount"
              min={0}
            />
            <ActionButton
              onClick={altStake.handleStake}
              disabled={altStake.isDisabled || parsedAltAmount <= 0}
              isLoading={altStake.isStaking}
              loadingText="Staking..."
              className="min-w-[120px]"
            >
              Stake (ALT)
            </ActionButton>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/40">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Transaction Retry Stake
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Auto-retry until blockhash expires (~2 minutes)
          </p>
          <div className="flex gap-3">
            <TokenAmountInput
              value={retryAmount}
              onChange={setRetryAmount}
              placeholder="Enter stake amount"
              min={0}
            />
            <ActionButton
              onClick={handleRetryClick}
              isLoading={false}
              loadingText="Retrying..."
              className="min-w-[140px]"
              disabled={parsedRetryAmount <= 0}
            >
              Stake (Retry)
            </ActionButton>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/40">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Jito Bundle Stake
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            MEV-protected transaction with tip to Jito validators
          </p>
          <div className="flex gap-3">
            <TokenAmountInput
              value={jitoAmount}
              onChange={setJitoAmount}
              placeholder="Enter stake amount"
              min={0}
            />
            <ActionButton
              onClick={handleJitoClick}
              isLoading={isJitoSubmitting}
              loadingText="Submitting..."
              className="min-w-[140px]"
              disabled={parsedJitoAmount <= 0 || isJitoSubmitting}
            >
              Stake (Jito)
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};
