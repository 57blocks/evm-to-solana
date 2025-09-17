// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: "Wallet not connected or program not available",
  INVALID_STAKE_AMOUNT: "Invalid stake amount",
  INVALID_UNSTAKE_AMOUNT: "Invalid unstake amount",
  STAKING_FAILED: "Staking failed",
  UNSTAKING_FAILED: "Unstaking failed",
  PROGRAM_NOT_READY: "Program is not ready yet",
  FAILED_TO_LOAD_STAKE_INFO: "Failed to load stake info",
  FAILED_TO_REFRESH: "Failed to refresh",
  UNKNOWN_ERROR: "Unknown error",
} as const;

// Constants for Solana token handling
const DEFAULT_DECIMALS = 9; // Solana tokens typically have 9 decimals (lamports)

// Validation constants
const MIN_TOKEN_AMOUNT = 0;
const MAX_TOKEN_AMOUNT = Number.MAX_SAFE_INTEGER;

export const convertToLamports = (
  amount: string | number,
  decimals: number = DEFAULT_DECIMALS
): bigint => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount) || numAmount < MIN_TOKEN_AMOUNT) {
    throw new Error("Invalid amount");
  }

  const multiplier = Math.pow(10, decimals);
  return BigInt(Math.floor(numAmount * multiplier));
};

export const convertFromLamports = (
  amount: bigint,
  decimals: number = DEFAULT_DECIMALS
): number => {
  return Number(amount) / Math.pow(10, decimals);
};

export const validateTokenAmount = (
  amount: string
): { isValid: boolean; error?: string } => {
  if (!amount || amount.trim() === "") {
    return { isValid: false, error: "Amount is required" };
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return { isValid: false, error: "Amount must be a valid number" };
  }

  if (numAmount <= MIN_TOKEN_AMOUNT) {
    return { isValid: false, error: "Amount must be greater than 0" };
  }

  if (numAmount > MAX_TOKEN_AMOUNT) {
    return { isValid: false, error: "Amount is too large" };
  }

  if (numAmount % 1 !== 0) {
    return { isValid: false, error: "Amount must be a whole number" };
  }

  return { isValid: true };
};

export const formatTokenAmount = (
  lamportAmount: bigint,
  decimals: number = DEFAULT_DECIMALS
): string => {
  if (lamportAmount === BigInt(0)) return "0";

  const tokenAmount = convertFromLamports(lamportAmount, decimals);

  // Simple formatting: just show the token amount with appropriate decimal places
  if (tokenAmount >= 1) {
    return tokenAmount.toFixed(4);
  } else if (tokenAmount >= 0.01) {
    return tokenAmount.toFixed(6);
  } else if (tokenAmount >= 0.0001) {
    return tokenAmount.toFixed(8);
  } else {
    return tokenAmount.toFixed(decimals);
  }
};

export const formatTimestamp = (timestamp: bigint) => {
  const timestampNumber = Number(timestamp);
  if (timestampNumber === 0) return "-";
  const date = new Date(timestampNumber * 1000);
  return date.toLocaleString("en-US");
};
