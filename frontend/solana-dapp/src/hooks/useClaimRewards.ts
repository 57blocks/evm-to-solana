import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { executeClaimRewardsTransaction } from "@/utils/stakingUtils";
import { formatErrorForDisplay } from "@/utils/programErrors";
import { ErrorInfo } from "@/components/ErrorModal";

export interface UseClaimRewardsReturn {
  handleClaimRewards: () => Promise<void>;
  isClaiming: boolean;
}

export type UseClaimRewardsOptions = {
  onSuccess: () => void;
  onError: (error: ErrorInfo) => void;
};

export const useClaimRewards = ({
  onSuccess,
  onError,
}: UseClaimRewardsOptions): UseClaimRewardsReturn => {
  const { publicKey } = useWallet();
  const { program } = useProgram();
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaimRewards = async () => {
    if (!publicKey || !program) {
      onError({ title: "Wallet Error", message: "Please connect your wallet first." });
      return;
    }

    if (isClaiming) return;

    setIsClaiming(true);

    try {
      await executeClaimRewardsTransaction({
        publicKey,
        program,
      });
      onSuccess();
    } catch (err) {
      const errorInfo = formatErrorForDisplay(err);
      onError(errorInfo);
    } finally {
      setIsClaiming(false);
    }
  };

  return {
    handleClaimRewards,
    isClaiming,
  };
};
