import { useState, useEffect } from "react";
import { useWatchContractEvent } from "wagmi";
import { Address, Hash, Log } from "viem";
import { STAKING_CONTRACT_ADDRESS } from "../../consts";
import { stakingAbi } from "../../abi/stakeAbi";

// Type for decoded Staked event args based on ABI
type StakedEventArgs = {
  user: Address;
  amount: bigint;
};

// Type for decoded event log using viem's DecodeEventLogReturnType
type StakedEventLog = Log & {
  args: StakedEventArgs;
  eventName: "Staked";
};

// Type for our component state
export type StakeEventState = {
  user: Address;
  amount: bigint;
  blockNumber: bigint;
  transactionHash: Hash;
};

interface UseStakeEventsProps {
  userAddress?: Address;
  isConnected: boolean;
  currentTransactionHash?: Hash | null;
}

export const useStakeEvents = ({
  userAddress,
  isConnected,
  currentTransactionHash,
}: UseStakeEventsProps) => {
  const [latestStakeEvent, setLatestStakeEvent] =
    useState<StakeEventState | null>(null);

  // Watch for Staked events from the contract
  useWatchContractEvent({
    address: STAKING_CONTRACT_ADDRESS,
    abi: stakingAbi,
    eventName: "Staked",
    args: userAddress ? { user: userAddress } : undefined, // Only watch events for current user
    onLogs(logs) {
      if (logs.length > 0) {
        const latestLog = logs[logs.length - 1]; // Get the most recent event
        console.log("New Staked event detected:", latestLog);

        // Type guard to check if this is a decoded log with args
        const isStakedEventLog = (log: Log): log is StakedEventLog => {
          return (
            "args" in log &&
            log.args !== null &&
            log.args !== undefined &&
            log.blockNumber !== null &&
            log.transactionHash !== null &&
            typeof log.args === "object" &&
            log.args !== null &&
            "user" in log.args &&
            "amount" in log.args
          );
        };

        if (
          isStakedEventLog(latestLog) &&
          latestLog.blockNumber !== null &&
          latestLog.transactionHash !== null
        ) {
          setLatestStakeEvent({
            user: latestLog.args.user,
            amount: latestLog.args.amount,
            blockNumber: latestLog.blockNumber,
            transactionHash: latestLog.transactionHash,
          });
        }
      }
    },
    enabled: !!userAddress && isConnected,
  });

  // Handle stake event detection for current transaction
  useEffect(() => {
    if (
      latestStakeEvent &&
      currentTransactionHash &&
      latestStakeEvent.transactionHash === currentTransactionHash
    ) {
      console.log(
        "Stake event confirmed for our transaction:",
        latestStakeEvent
      );
    }
  }, [latestStakeEvent, currentTransactionHash]);

  const clearLatestStakeEvent = () => {
    setLatestStakeEvent(null);
  };

  return {
    latestStakeEvent,
    clearLatestStakeEvent,
  };
};
