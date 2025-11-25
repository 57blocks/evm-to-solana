import { useState, useEffect, useRef } from "react";
import { useProgram } from "./useProgram";
import { PublicKey } from "@solana/web3.js";

export type StakeEventState = {
  user: string;
  amount: bigint;
  slot: number;
  transactionSignature: string;
};

interface UseStakeEventsProps {
  userAddress: PublicKey | null;
  isConnected: boolean;
}

export const useStakeEvents = ({
  userAddress,
  isConnected,
}: UseStakeEventsProps) => {
  const [latestStakeEvent, setLatestStakeEvent] =
    useState<StakeEventState | null>(null);
  const { program } = useProgram();
  const listenerRef = useRef<number | null>(null);

  // Clear event when user changes or disconnects
  useEffect(() => {
    setLatestStakeEvent(null);
  }, [userAddress]);

  // Simple and direct: use program.addEventListener for all stake events
  useEffect(() => {
    if (!program || !isConnected) {
      return;
    }

    // Clean up previous listener
    if (listenerRef.current !== null) {
      program.removeEventListener(listenerRef.current);
      listenerRef.current = null;
    }

    // Listen to all "staked" events
    const listenerId = program.addEventListener(
      "staked",
      (event, slot, signature) => {
        // Only show events for the current user
        if (userAddress && event.user.equals(userAddress)) {
          setLatestStakeEvent({
            user: event.user.toBase58(),
            amount: BigInt(event.amount.toString()),
            transactionSignature: signature || "",
            slot: slot || Date.now(),
          });
        }
      }
    );

    listenerRef.current = listenerId;

    // Cleanup
    return () => {
      if (listenerRef.current !== null) {
        program.removeEventListener(listenerRef.current);
        listenerRef.current = null;
      }
    };
  }, [program, isConnected, userAddress]);

  const clearLatestStakeEvent = () => {
    setLatestStakeEvent(null);
  };

  return {
    latestStakeEvent,
    clearLatestStakeEvent,
  };
};
