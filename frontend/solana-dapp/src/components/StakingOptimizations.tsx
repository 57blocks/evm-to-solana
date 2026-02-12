import { useState } from "react";
import { ErrorInfo } from "./ErrorModal";
import { TokenAmountInput } from "./TokenAmountInput";
import { ActionButton } from "./ActionButton";
import { usePriorityFee } from "@/hooks/usePriorityFee";
import { useStakeByLookupTable } from "@/hooks/useStakeByLookupTable";
import { useJitoStake } from "@/hooks/useJitoStake";
import { useTransactionRetry } from "@/hooks/useTransactionRetry";
import { parseAmount, formatAmountForInput } from "@/utils/tokenUtils";

interface StakingOptimizationsProps {
  onSuccess: () => void;
  onError: (errorInfo: ErrorInfo) => void;
}

export const StakingOptimizations: React.FC<StakingOptimizationsProps> = ({
  onSuccess,
  onError,
}) => {
  const [priorityAmount, setPriorityAmount] = useState(0);
  const [altAmount, setAltAmount] = useState(0);
  const [jitoAmount, setJitoAmount] = useState(0);
  const [retryAmount, setRetryAmount] = useState(0);

  const { handlePriorityStake } = usePriorityFee({
    onSuccess: () => {
      setPriorityAmount(0);
      onSuccess();
    },
    onError,
    stakeAmount: priorityAmount,
  });

  const altStake = useStakeByLookupTable({
    stakeAmount: altAmount,
    onSuccess: () => {
      setAltAmount(0);
      onSuccess();
    },
    onError,
  });

  const { executeJitoStake, isSubmitting: isJitoSubmitting } = useJitoStake({
    onSuccess: () => {
      setJitoAmount(0);
      onSuccess();
    },
    onError,
    stakeAmount: jitoAmount,
  });

  const { executeStakeWithRetry } = useTransactionRetry({
    onSuccess: () => {
      setRetryAmount(0);
      onSuccess();
    },
    onError,
    stakeAmount: retryAmount,
  });

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
              value={formatAmountForInput(priorityAmount)}
              onChange={(v) => setPriorityAmount(parseAmount(v))}
              placeholder="Enter stake amount"
              min={0}
            />
            <ActionButton
              onClick={handlePriorityStake}
              isLoading={false}
              loadingText="Submitting..."
              className="min-w-[140px]"
              disabled={priorityAmount <= 0}
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
              value={formatAmountForInput(altAmount)}
              onChange={(v) => setAltAmount(parseAmount(v))}
              placeholder="Enter stake amount"
              min={0}
            />
            <ActionButton
              onClick={altStake.handleStake}
              disabled={altStake.isDisabled || altAmount <= 0}
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
            Auto-retry until blockhash expires
          </p>
          <div className="flex gap-3">
            <TokenAmountInput
              value={formatAmountForInput(retryAmount)}
              onChange={(v) => setRetryAmount(parseAmount(v))}
              placeholder="Enter stake amount"
              min={0}
            />
            <ActionButton
              onClick={executeStakeWithRetry}
              isLoading={false}
              loadingText="Retrying..."
              className="min-w-[140px]"
              disabled={retryAmount <= 0}
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
              value={formatAmountForInput(jitoAmount)}
              onChange={(v) => setJitoAmount(parseAmount(v))}
              placeholder="Enter stake amount"
              min={0}
            />
            <ActionButton
              onClick={executeJitoStake}
              isLoading={isJitoSubmitting}
              loadingText="Submitting..."
              className="min-w-[140px]"
              disabled={jitoAmount <= 0 || isJitoSubmitting}
            >
              Stake (Jito)
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};
