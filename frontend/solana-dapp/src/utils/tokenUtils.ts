// Constants for Solana token handling
const DEFAULT_DECIMALS = 9; // Solana tokens typically have 9 decimals (lamports)

/**
 * Convert token amount to lamports (Solana's smallest unit)
 * @param amount - Token amount as string or number
 * @param decimals - Token decimals (default: 9 for Solana)
 * @returns Amount in lamports as BigInt
 */
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

/**
 * Convert lamports to token amount
 * @param lamports - Amount in lamports as BigInt
 * @param decimals - Token decimals (default: 9 for Solana)
 * @returns Token amount as number
 */
export const convertFromLamports = (
  lamports: bigint,
  decimals: number = DEFAULT_DECIMALS
): number => {
  const divisor = Math.pow(10, decimals);
  return Number(lamports) / divisor;
};

/**
 * Format token amount for display
 * @param lamports - Amount in lamports as BigInt
 * @param decimals - Token decimals (default: 9 for Solana)
 * @returns Formatted token amount string
 */
export const formatTokenAmount = (
  lamports: bigint,
  decimals: number = DEFAULT_DECIMALS
): string => {
  const tokenAmount = convertFromLamports(lamports, decimals);

  if (tokenAmount === 0) return "0";

  // Format with appropriate precision based on magnitude
  if (tokenAmount >= 100) {
    return tokenAmount.toLocaleString();
  } else if (tokenAmount >= 1) {
    return tokenAmount.toFixed(4);
  } else if (tokenAmount >= 0.01) {
    return tokenAmount.toFixed(6);
  } else if (tokenAmount >= 0.0001) {
    return tokenAmount.toFixed(8);
  } else {
    return tokenAmount.toFixed(decimals);
  }
};

/**
 * Format token amount with custom precision
 * @param lamports - Amount in lamports as BigInt
 * @param precision - Number of decimal places to show
 * @param decimals - Token decimals (default: 9 for Solana)
 * @returns Formatted token amount string
 */
export const formatTokenAmountWithPrecision = (
  lamports: bigint,
  precision: number,
  decimals: number = DEFAULT_DECIMALS
): string => {
  const tokenAmount = convertFromLamports(lamports, decimals);
  return tokenAmount.toFixed(precision);
};

/**
 * Validate token amount input
 * @param amount - User input amount as string
 * @returns Validation result with isValid flag and optional error message
 */
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

// Legacy function names for compatibility with existing code
export const convertToWei = convertToLamports;
export const convertFromWei = convertFromLamports;
