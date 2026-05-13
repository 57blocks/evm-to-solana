import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useClaimRewards } from "../hooks/useClaimRewards";
import { ErrorInfo } from "./ErrorModal";
import { ActionButton } from "./ActionButton";

interface ClaimRewardsProps {
  onSuccess: () => void;
  onError: (errorInfo: ErrorInfo) => void;
}

const ClaimRewards: React.FC<ClaimRewardsProps> = ({ onSuccess, onError }) => {
  const { publicKey } = useWallet();
  const [showSuccess, setShowSuccess] = useState(false);

  const { handleClaimRewards, isClaiming } = useClaimRewards({
    onSuccess: () => {
      setShowSuccess(true);
      onSuccess();
    },
    onError,
  });

  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => setShowSuccess(false), 5000);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  return (
    <div>
      <ActionButton
        onClick={handleClaimRewards}
        disabled={!publicKey || isClaiming}
        isLoading={isClaiming}
        loadingText="Claiming..."
        spinnerType="char"
        variant="default"
        className="w-full"
      >
        Claim Rewards
      </ActionButton>
      {showSuccess && (
        <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-green-700 text-sm">
          Rewards claimed successfully. Please check back shortly for updated data.
        </div>
      )}
    </div>
  );
};

export default ClaimRewards;
