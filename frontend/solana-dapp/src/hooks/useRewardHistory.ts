import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";

export interface PoolRewardInfo {
  poolConfig: string;
  poolId: string;
  stakedAmount: string;
  pendingRewards: string;
  claimedRewards: string;
}

export interface ActivityRecord {
  eventType: string;
  amount: string;
  blockNumber: number;
  txHash: string;
  timestamp: number;
}

export interface UserRewardResponse {
  userAddress: string;
  pools: PoolRewardInfo[];
  totalStaked: string;
  totalPendingRewards: string;
  totalClaimedRewards: string;
  activities: ActivityRecord[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function fetchRewards(userAddress: string): Promise<UserRewardResponse> {
  const res = await fetch(`${API_BASE}/api/rewards/${userAddress}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch rewards: ${res.statusText}`);
  }
  return res.json();
}

export const useRewardHistory = (publicKey: PublicKey | null) => {
  const address = publicKey?.toBase58() ?? "";

  const rewards = useQuery<UserRewardResponse>({
    queryKey: ["reward-history", address],
    queryFn: () => fetchRewards(address),
    enabled: !!address,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  return {
    rewards,
    activities: rewards.data?.activities ?? [],
    refetchAll: () => { rewards.refetch(); },
  };
};
