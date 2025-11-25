import React from "react";
import { formatTokenAmount } from "../utils/tokenUtils";

export interface StakeEventData {
  user: string;
  amount: bigint;
  blockNumber: bigint;
  transactionHash: string;
}

interface GlobalToastProps {
  stakeEvent: StakeEventData | null;
  onClose: () => void;
}

const GlobalToast: React.FC<GlobalToastProps> = ({ stakeEvent, onClose }) => {
  if (!stakeEvent) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="relative bg-white border-2 border-green-500 rounded-xl shadow-2xl p-6 w-[90%] max-w-[450px] min-w-[300px] text-center m-5 md:w-[95%] md:max-w-[350px] md:min-w-[280px] md:p-5 md:m-4" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose} 
          className="absolute top-2.5 right-2.5 bg-transparent border-none text-xl text-gray-400 cursor-pointer w-6 h-6 flex items-center justify-center rounded-full hover:text-gray-600 hover:bg-gray-100 transition-colors" 
          title="Close"
        >
          ✕
        </button>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-2 font-semibold text-lg text-green-500 md:text-base">
            <span className="text-xl md:text-lg">✅</span>
            <span>Stake Successful!</span>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-gray-50 rounded-lg border border-green-200">
            <div className="block text-xs text-gray-600 font-medium uppercase tracking-wider mb-1">
              Amount Staked
            </div>
            <div className="block text-2xl font-bold text-green-500 leading-tight md:text-xl">
              {formatTokenAmount(stakeEvent.amount)} tokens
            </div>
          </div>

          <div className="flex justify-center">
            <a
              href={`https://sepolia.etherscan.io/tx/${stakeEvent.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white no-underline rounded-md text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors md:text-xs md:px-4 md:py-2"
            >
              View on Etherscan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalToast;
