import StakeTokens from "./StakeTokens";
import UnstakeTokens from "./UnstakeTokens";
import { ErrorInfo } from "./ErrorModal";

interface StakingActionsProps {
  onSuccess: () => void;
  onError: (errorInfo: ErrorInfo) => void;
}

const StakingActions: React.FC<StakingActionsProps> = ({
  onSuccess,
  onError,
}) => {
  return (
    <div className="bg-white/95 rounded-2xl shadow-xl backdrop-blur-sm p-6 h-full flex flex-col">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Staking Operations</h2>

      {/* Staking Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Stake Tokens</h3>
        <StakeTokens onSuccess={onSuccess} onError={onError} />
      </div>

      {/* Unstaking Section */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Unstake Tokens</h3>
        <UnstakeTokens onSuccess={onSuccess} onError={onError} />
      </div>
    </div>
  );
};

export default StakingActions;
