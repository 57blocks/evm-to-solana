import { useEffect } from "react";
import { StakeEventState } from "@/hooks/useStakeEvents";
import { formatTokenAmount } from "@/utils/tokenUtils";

interface StakeSuccessToastProps {
  stakeEvent: StakeEventState | null;
  onClose: () => void;
  autoHideDuration?: number;
}

const StakeSuccessToast: React.FC<StakeSuccessToastProps> = ({
  stakeEvent,
  onClose,
  autoHideDuration = 1000,
}) => {
  useEffect(() => {
    if (!stakeEvent) return;

    const timer = setTimeout(() => {
      onClose();
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [stakeEvent, onClose, autoHideDuration]);

  if (!stakeEvent) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100000]">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-[340px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">
              Stake confirmed
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Amount: {formatTokenAmount(stakeEvent.amount)} tokens
            </p>
            <p className="text-xs text-gray-500 mt-2 break-all">
              {stakeEvent.transactionSignature}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default StakeSuccessToast;
