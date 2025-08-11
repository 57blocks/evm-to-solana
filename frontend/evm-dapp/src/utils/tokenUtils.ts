/**
 * Token utility functions for converting between wei and token units
 */

// Default decimals for most ERC20 tokens (including ETH)
const DEFAULT_DECIMALS = 18;

/**
 * Convert token amount to wei (smallest unit)
 * @param amount - Token amount as string or number
 * @param decimals - Token decimals (default: 18)
 * @returns Amount in wei as bigint
 */
export const convertToWei = (
  amount: string | number,
  decimals: number = DEFAULT_DECIMALS
): bigint => {
  const amountStr = amount.toString();
  return BigInt(amountStr) * BigInt(10 ** decimals);
};

/**
 * Convert wei amount to token units
 * @param weiAmount - Amount in wei as bigint
 * @param decimals - Token decimals (default: 18)
 * @returns Token amount as number
 */
export const convertFromWei = (
  weiAmount: bigint,
  decimals: number = DEFAULT_DECIMALS
): number => {
  if (weiAmount === BigInt(0)) return 0;
  return Number(weiAmount) / Math.pow(10, decimals);
};

/**
 * Format token amount for display - simple division by 10^18
 * @param weiAmount - Amount in wei as bigint
 * @param decimals - Token decimals (default: 18)
 * @returns Formatted string for display
 */
export const formatTokenAmount = (
  weiAmount: bigint,
  decimals: number = DEFAULT_DECIMALS
): string => {
  if (weiAmount === BigInt(0)) return "0";

  const tokenAmount = convertFromWei(weiAmount, decimals);

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

/**
 * Format token amount with custom precision
 * @param weiAmount - Amount in wei as bigint
 * @param decimals - Token decimals (default: 18)
 * @param precision - Number of decimal places to show
 * @returns Formatted string with custom precision
 */
export const formatTokenAmountWithPrecision = (
  weiAmount: bigint,
  decimals: number = DEFAULT_DECIMALS,
  precision: number = 4
): string => {
  if (weiAmount === BigInt(0)) return "0";

  const tokenAmount = convertFromWei(weiAmount, decimals);
  return tokenAmount.toFixed(precision);
};

/**
 * Validate token amount input
 * @param amount - Token amount as string
 * @returns Object with isValid boolean and error message if invalid
 */
export const validateTokenAmount = (
  amount: string
): { isValid: boolean; error?: string } => {
  if (!amount || amount.trim() === "") {
    return { isValid: false, error: "Amount is required" };
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum)) {
    return { isValid: false, error: "Invalid number format" };
  }

  if (amountNum <= 0) {
    return { isValid: false, error: "Amount must be greater than 0" };
  }

  if (amount.includes(".") || amount.includes(",")) {
    return {
      isValid: false,
      error: "Please enter a whole number (no decimals)",
    };
  }

  return { isValid: true };
};
