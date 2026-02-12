import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { validateTokenAmount, parseAmount } from "../utils/tokenUtils";
import { useUnstake } from "@/hooks/useUnstake";
import { ErrorInfo } from "./ErrorModal";
import { TokenAmountInput } from "./TokenAmountInput";
import { ActionButton } from "./ActionButton";

interface UnstakeTokensProps {
  onSuccess: () => void;
  onError: (errorInfo: ErrorInfo) => void;
}

const UnstakeTokens: React.FC<UnstakeTokensProps> = ({
  onSuccess,
  onError,
}) => {
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const { unstake, isUnstaking } = useUnstake({ onSuccess, onError });
  const { connected, publicKey } = useWallet();

  const handleUnstake = async () => {
    if (!connected || !publicKey) {
      onError({ message: "Please connect your wallet first" });
      return;
    }

    if (!unstakeAmount || isUnstaking) {
      return;
    }

    // Validate input using utility function
    const validation = validateTokenAmount(unstakeAmount);
    if (!validation.isValid) {
      onError({ message: validation.error || "Invalid amount" });
      return;
    }

    const result = await unstake(unstakeAmount);
    if (result) {
      setUnstakeAmount("");
    }
  };

  const isDisabled = !connected || isUnstaking;

  return (
    <div className="flex gap-3">
      <TokenAmountInput
        value={unstakeAmount}
        onChange={setUnstakeAmount}
        placeholder={
          connected
            ? "Enter unstake amount (1 = 1 token)"
            : "Connect wallet first"
        }
        disabled={isDisabled}
        connected={connected}
      />
      <ActionButton
        onClick={handleUnstake}
        disabled={!unstakeAmount || isDisabled || parseAmount(unstakeAmount) <= 0}
        isLoading={isUnstaking}
        loadingText="Unstaking..."
        spinnerType="char"
        variant="default"
        className="min-w-[120px]"
      >
        Unstake
      </ActionButton>
    </div>
  );
};

export default UnstakeTokens;
