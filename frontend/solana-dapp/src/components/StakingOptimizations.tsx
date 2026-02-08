import { useState } from "react";
import { ErrorInfo } from "./ErrorModal";
import { TokenAmountInput } from "./TokenAmountInput";
import { ActionButton } from "./ActionButton";
import { usePriorityFee } from "@/hooks/usePriorityFee";
import { useStakeByLookupTable } from "@/hooks/useStakeByLookupTable";

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

  const parsedPriorityAmount = Number.parseInt(priorityAmount || "0", 10);
  const parsedAltAmount = Number.parseInt(altAmount || "0", 10);

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

  const handlePriorityClick = async () => {
    if (!parsedPriorityAmount || parsedPriorityAmount <= 0) {
      onError({ message: "Please enter a valid stake amount" });
      return;
    }
    await handlePriorityStake();
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
      </div>
    </div>
  );
};
