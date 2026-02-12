import { useWallet } from "@solana/wallet-adapter-react";
import { useStake } from "../hooks/useStake";
import { ErrorInfo } from "./ErrorModal";
import { TokenAmountInput } from "./TokenAmountInput";
import { ActionButton } from "./ActionButton";
import { formatAmountForInput, parseAmount } from "@/utils/tokenUtils";

interface StakeTokensProps {
  onSuccess: () => void;
  onError: (errorInfo: ErrorInfo) => void;
}

const StakeTokens: React.FC<StakeTokensProps> = ({ onSuccess, onError }) => {
  const { connected } = useWallet();

  // Use custom hook
  const { stakeAmount, isStaking, setStakeAmount, handleStake, isDisabled } =
    useStake({ onSuccess, onError });

  return (
    <div className="flex gap-3">
      <TokenAmountInput
        value={formatAmountForInput(stakeAmount)}
        onChange={(v) => setStakeAmount(parseAmount(v) || undefined)}
        placeholder={
          connected
            ? "Enter stake amount (1 = 1 token)"
            : "Connect wallet first"
        }
        disabled={isDisabled}
        min={0}
        connected={connected}
      />
      <ActionButton
        onClick={handleStake}
        disabled={!stakeAmount || isDisabled || stakeAmount <= 0}
        isLoading={isStaking}
        loadingText="Staking..."
        spinnerType="char"
        variant="default"
        className="min-w-[120px]"
      >
        Stake
      </ActionButton>
    </div>
  );
};

export default StakeTokens;
