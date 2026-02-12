import {
  Transaction,
  SystemProgram,
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";

// Jito API URLs
const JITO_BLOCK_ENGINE_URL = "https://testnet.block-engine.jito.wtf";
// Use Vite proxy to avoid CORS issues (proxy configured in vite.config.ts)
const JITO_TIP_FLOOR_URL = "/api/v1/bundles/tip_floor";

// Jito minimum tip is 1000 lamports
export const JITO_MIN_TIP_LAMPORTS = 1000;

// Fallback tip accounts in case API fails
// https://docs.jito.wtf/lowlatencytxnsend/#response-example-tips
const FALLBACK_TIP_ACCOUNTS = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
];

// Tip floor response type from Jito API
export type TipFloorResponse = {
  time: string;
  landed_tips_25th_percentile: number;
  landed_tips_50th_percentile: number;
  landed_tips_75th_percentile: number;
  landed_tips_95th_percentile: number;
  landed_tips_99th_percentile: number;
  ema_landed_tips_50th_percentile: number;
};

// Cache for tip floor data
const tipFloorCache: { data: TipFloorResponse | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
const TIP_FLOOR_CACHE_DURATION_MS = 10 * 1000; // 10 seconds

/**
 * Fetch tip accounts from Jito API
 * Falls back to hardcoded accounts if API fails
 */
export const fetchTipAccounts = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${JITO_BLOCK_ENGINE_URL}/api/v1/getTipAccounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTipAccounts",
        params: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error.message || "API error");
    }

    const accounts = result.result as string[];
    if (accounts && accounts.length > 0) {
      return accounts;
    }

    throw new Error("No tip accounts returned");
  } catch (error) {
    console.warn("Failed to fetch tip accounts, using fallback:", error);
    return FALLBACK_TIP_ACCOUNTS;
  }
};

/**
 * Get a random Jito tip account
 */
export const getRandomTipAccount = async (): Promise<PublicKey> => {
  const tipAccounts = await fetchTipAccounts();
  const randomIndex = Math.floor(Math.random() * tipAccounts.length);
  return new PublicKey(tipAccounts[randomIndex]);
};

/**
 * Fetch tip floor data from Jito API
 * Returns recommended tip amounts based on recent landed transactions
 */
export const fetchTipFloor = async (): Promise<TipFloorResponse | null> => {
  // Return cached data if still valid
  if (
    tipFloorCache.data &&
    Date.now() - tipFloorCache.timestamp < TIP_FLOOR_CACHE_DURATION_MS
  ) {
    return tipFloorCache.data;
  }

  try {
    // Add cache-busting to avoid 304 responses
    const response = await fetch(`${JITO_TIP_FLOOR_URL}?_t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = (await response.json()) as TipFloorResponse[];

    if (result && result.length > 0) {
      // API returns an array, get the most recent entry
      tipFloorCache.data = result[0];
      tipFloorCache.timestamp = Date.now();
      return tipFloorCache.data;
    }

    return null;
  } catch (error) {
    console.warn("Failed to fetch tip floor:", error);
    return null;
  }
};

/**
 * Calculate fees for sendTransaction using 70/30 rule
 * Returns { priorityFee, jitoTip } in lamports
 *
 * For sendTransaction: 70% priority fee + 30% Jito tip
 */
export const calculateJitoFees = async (): Promise<{
  priorityFee: number;
  jitoTip: number;
  totalFee: number;
}> => {
  const tipFloor = await fetchTipFloor();

  if (!tipFloor) {
    // Fallback: use minimum values
    const minTotal = JITO_MIN_TIP_LAMPORTS * 2; // Ensure we have enough for both
    return {
      priorityFee: Math.ceil(minTotal * 0.7),
      jitoTip: Math.ceil(minTotal * 0.3),
      totalFee: minTotal,
    };
  }

  // Use 50th percentile (median) as base
  // The API returns values in SOL, convert to lamports
  const baseFee = Math.ceil(
    tipFloor.landed_tips_50th_percentile * LAMPORTS_PER_SOL
  );

  // Ensure minimum tip requirement is met
  const totalFee = Math.max(JITO_MIN_TIP_LAMPORTS, baseFee);

  // Apply 70/30 split
  const priorityFee = Math.ceil(totalFee * 0.7);
  const jitoTip = Math.max(JITO_MIN_TIP_LAMPORTS, Math.ceil(totalFee * 0.3));
  return { priorityFee, jitoTip, totalFee: priorityFee + jitoTip };
};

/**
 * Create priority fee instruction
 */
export const createPriorityFeeInstruction = (
  microLamports: number
): TransactionInstruction => {
  return ComputeBudgetProgram.setComputeUnitPrice({
    microLamports,
  });
};

/**
 * Create Jito tip instruction (SOL transfer to tip account)
 */
export const createJitoTipInstruction = async (
  payer: PublicKey,
  tipLamports: number
): Promise<TransactionInstruction> => {
  const tipAccount = await getRandomTipAccount();

  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: tipAccount,
    lamports: tipLamports,
  });
};

/**
 * Send transaction via Jito's sendTransaction endpoint
 * This provides MEV protection and fast transaction landing
 *
 * bundleOnly=true: For cost efficiency, enables revert protection by sending
 * the transaction exclusively as a single transaction bundle.
 * Note: This method always sets skip_preflight=true (no RPC simulation)
 */
export const sendJitoTransaction = async (
  signedTransaction: Transaction
): Promise<string> => {
  try {
    const serialized = signedTransaction.serialize();
    const base58Tx = bs58.encode(serialized);

    const response = await fetch(
      `${JITO_BLOCK_ENGINE_URL}/api/v1/transactions?bundleOnly=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sendTransaction",
          params: [base58Tx],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Jito API request failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(
        `Jito sendTransaction error: ${result.error.message || JSON.stringify(result.error)}`
      );
    }

    const signature = result.result;
    return signature;
  } catch (error) {
    console.error("Failed to send transaction via Jito:", error);
    throw new Error(
      `Jito transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

/**
 * Wait for transaction confirmation
 */
export const waitForConfirmation = async (
  connection: Connection,
  signature: string,
  timeoutMs: number = 160000
): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const statuses = await connection.getSignatureStatuses([signature], {
        searchTransactionHistory: false,
      });

      const status = statuses.value[0];
      if (
        status?.confirmationStatus === "confirmed" ||
        status?.confirmationStatus === "finalized"
      ) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn("Error checking transaction status:", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return false;
};
