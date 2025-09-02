// Constants for Solana token handling
const DEFAULT_DECIMALS = 9; // Solana tokens typically have 9 decimals (lamports)

export const convertToLamports = (
  amount: string | number,
  decimals: number = DEFAULT_DECIMALS
): bigint => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount) || numAmount < 0) {
    throw new Error("Invalid amount");
  }

  const multiplier = Math.pow(10, decimals);
  return BigInt(Math.floor(numAmount * multiplier));
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

  if (numAmount <= 0) {
    return { isValid: false, error: "Amount must be greater than 0" };
  }

  if (numAmount % 1 !== 0) {
    return { isValid: false, error: "Amount must be a whole number" };
  }

  return { isValid: true };
};

export const formatTimestamp = (timestamp: bigint) => {
  const timestampNumber = Number(timestamp);
  if (timestampNumber === 0) return "-";
  const date = new Date(timestampNumber * 1000);
  return date.toLocaleString("en-US");
};
