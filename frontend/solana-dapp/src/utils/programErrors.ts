/**
 * Unified Error Handling System
 *
 * All frontend errors are classified into 4 levels:
 * 1. WalletAdapter - Wallet connection/signing issues
 * 2. RpcNetwork - RPC/network communication issues
 * 3. OnChainProgram - On-chain program/contract errors
 * 4. Unknown - Unclassified errors
 */

// ============================================================================
// Error Level Enum
// ============================================================================

export enum ErrorLevel {
  WalletAdapter = "WalletAdapter",
  RpcNetwork = "RpcNetwork",
  OnChainProgram = "OnChainProgram",
  Unknown = "Unknown",
}

// ============================================================================
// Error Type Definitions
// ============================================================================

export interface WalletAdapterError {
  code: string;
  message: string;
  userMessage: string;
}

export interface RpcNetworkError {
  code: string;
  message: string;
  userMessage: string;
}

export interface ProgramError {
  code: number | string;
  message: string;
  userMessage: string;
}

export interface ClassifiedError {
  level: ErrorLevel;
  error: WalletAdapterError | RpcNetworkError | ProgramError | null;
  originalError: unknown;
}

export interface FormattedError {
  title: string;
  message: string;
  code?: string | number;
  level?: ErrorLevel;
}

// ============================================================================
// Wallet Adapter Error Patterns
// ============================================================================

const WALLET_ADAPTER_ERRORS: Record<string, WalletAdapterError> = {
  USER_REJECTED: {
    code: "WALLET_USER_REJECTED",
    message: "User rejected the request",
    userMessage: "You cancelled the transaction. Please try again if you want to proceed.",
  },
  NOT_CONNECTED: {
    code: "WALLET_NOT_CONNECTED",
    message: "Wallet not connected",
    userMessage: "Please connect your wallet first.",
  },
  DISCONNECTED: {
    code: "WALLET_DISCONNECTED",
    message: "Wallet disconnected",
    userMessage: "Your wallet was disconnected. Please reconnect and try again.",
  },
  NOT_INSTALLED: {
    code: "WALLET_NOT_INSTALLED",
    message: "Wallet not installed",
    userMessage: "The selected wallet is not installed. Please install it and try again.",
  },
  SIGN_TRANSACTION_ERROR: {
    code: "WALLET_SIGN_ERROR",
    message: "Failed to sign transaction",
    userMessage: "Failed to sign the transaction. Please try again.",
  },
  SIGN_MESSAGE_ERROR: {
    code: "WALLET_SIGN_MESSAGE_ERROR",
    message: "Failed to sign message",
    userMessage: "Failed to sign the message. Please try again.",
  },
  CONNECTION_ERROR: {
    code: "WALLET_CONNECTION_ERROR",
    message: "Failed to connect wallet",
    userMessage: "Failed to connect to your wallet. Please try again.",
  },
  TIMEOUT: {
    code: "WALLET_TIMEOUT",
    message: "Wallet operation timed out",
    userMessage: "The wallet operation timed out. Please try again.",
  },
};

function matchWalletAdapterError(errorMessage: string): WalletAdapterError | null {
  const lowerMessage = errorMessage.toLowerCase();

  if (
    lowerMessage.includes("user rejected") ||
    lowerMessage.includes("user denied") ||
    lowerMessage.includes("user cancelled") ||
    lowerMessage.includes("user canceled") ||
    lowerMessage.includes("rejected the request")
  ) {
    return WALLET_ADAPTER_ERRORS.USER_REJECTED;
  }

  if (
    lowerMessage.includes("wallet not connected") ||
    lowerMessage.includes("not connected")
  ) {
    return WALLET_ADAPTER_ERRORS.NOT_CONNECTED;
  }

  if (lowerMessage.includes("disconnected")) {
    return WALLET_ADAPTER_ERRORS.DISCONNECTED;
  }

  if (
    lowerMessage.includes("not installed") ||
    lowerMessage.includes("wallet not found")
  ) {
    return WALLET_ADAPTER_ERRORS.NOT_INSTALLED;
  }

  if (
    lowerMessage.includes("failed to sign transaction") ||
    lowerMessage.includes("signing failed")
  ) {
    return WALLET_ADAPTER_ERRORS.SIGN_TRANSACTION_ERROR;
  }

  if (lowerMessage.includes("failed to sign message")) {
    return WALLET_ADAPTER_ERRORS.SIGN_MESSAGE_ERROR;
  }

  if (
    lowerMessage.includes("failed to connect") ||
    lowerMessage.includes("connection failed")
  ) {
    return WALLET_ADAPTER_ERRORS.CONNECTION_ERROR;
  }

  if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
    return WALLET_ADAPTER_ERRORS.TIMEOUT;
  }

  return null;
}

// ============================================================================
// RPC/Network Error Patterns
// ============================================================================

const RPC_NETWORK_ERRORS: Record<string, RpcNetworkError> = {
  NETWORK_ERROR: {
    code: "RPC_NETWORK_ERROR",
    message: "Network error",
    userMessage: "Network error. Please check your internet connection and try again.",
  },
  RATE_LIMITED: {
    code: "RPC_RATE_LIMITED",
    message: "Rate limited",
    userMessage: "Too many requests. Please wait a moment and try again.",
  },
  RPC_ERROR: {
    code: "RPC_ERROR",
    message: "RPC error",
    userMessage: "Failed to communicate with the network. Please try again.",
  },
  BLOCKHASH_NOT_FOUND: {
    code: "RPC_BLOCKHASH_NOT_FOUND",
    message: "Blockhash not found",
    userMessage: "Transaction expired. Please try again.",
  },
  BLOCKHASH_EXPIRED: {
    code: "RPC_BLOCKHASH_EXPIRED",
    message: "Blockhash expired",
    userMessage: "Transaction expired. Please try again.",
  },
  SIMULATION_FAILED: {
    code: "RPC_SIMULATION_FAILED",
    message: "Transaction simulation failed",
    userMessage: "Transaction simulation failed. The transaction may not succeed.",
  },
  INSUFFICIENT_FUNDS_FOR_RENT: {
    code: "RPC_INSUFFICIENT_RENT",
    message: "Insufficient funds for rent",
    userMessage: "Insufficient SOL for account rent. Please add more SOL to your wallet.",
  },
  INSUFFICIENT_FUNDS: {
    code: "RPC_INSUFFICIENT_FUNDS",
    message: "Insufficient funds",
    userMessage: "Insufficient funds. Please check your balance.",
  },
  SEND_TRANSACTION_ERROR: {
    code: "RPC_SEND_ERROR",
    message: "Failed to send transaction",
    userMessage: "Failed to send transaction. Please try again.",
  },
  NODE_UNHEALTHY: {
    code: "RPC_NODE_UNHEALTHY",
    message: "RPC node unhealthy",
    userMessage: "The network is experiencing issues. Please try again later.",
  },
};

function matchRpcNetworkError(errorMessage: string): RpcNetworkError | null {
  const lowerMessage = errorMessage.toLowerCase();

  if (
    lowerMessage.includes("network error") ||
    lowerMessage.includes("fetch failed") ||
    lowerMessage.includes("failed to fetch")
  ) {
    return RPC_NETWORK_ERRORS.NETWORK_ERROR;
  }

  if (
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("429") ||
    lowerMessage.includes("too many requests")
  ) {
    return RPC_NETWORK_ERRORS.RATE_LIMITED;
  }

  if (
    lowerMessage.includes("blockhash not found") ||
    lowerMessage.includes("blockhash was not found")
  ) {
    return RPC_NETWORK_ERRORS.BLOCKHASH_NOT_FOUND;
  }

  if (
    lowerMessage.includes("blockhash expired") ||
    lowerMessage.includes("block height exceeded")
  ) {
    return RPC_NETWORK_ERRORS.BLOCKHASH_EXPIRED;
  }

  if (lowerMessage.includes("simulation failed")) {
    return RPC_NETWORK_ERRORS.SIMULATION_FAILED;
  }

  if (lowerMessage.includes("insufficient funds for rent")) {
    return RPC_NETWORK_ERRORS.INSUFFICIENT_FUNDS_FOR_RENT;
  }

  if (
    lowerMessage.includes("insufficient funds") ||
    lowerMessage.includes("insufficient lamports") ||
    lowerMessage.includes("0x1") // Custom program error for insufficient funds
  ) {
    return RPC_NETWORK_ERRORS.INSUFFICIENT_FUNDS;
  }

  if (
    lowerMessage.includes("failed to send transaction") ||
    lowerMessage.includes("transaction failed")
  ) {
    return RPC_NETWORK_ERRORS.SEND_TRANSACTION_ERROR;
  }

  if (
    lowerMessage.includes("node is unhealthy") ||
    lowerMessage.includes("node unhealthy")
  ) {
    return RPC_NETWORK_ERRORS.NODE_UNHEALTHY;
  }

  // Generic RPC error check
  if (lowerMessage.includes("rpc") && lowerMessage.includes("error")) {
    return RPC_NETWORK_ERRORS.RPC_ERROR;
  }

  return null;
}

// ============================================================================
// On-Chain Program Error Patterns
// ============================================================================

// Solana staking program custom errors (based on your Anchor IDL)
const PROGRAM_ERRORS: Record<number, ProgramError> = {
  6000: {
    code: 6000,
    message: "InsufficientStakeAmount",
    userMessage: "The stake amount is too low. Please enter a higher amount.",
  },
  6001: {
    code: 6001,
    message: "InsufficientStakedBalance",
    userMessage: "You don't have enough staked tokens to unstake this amount.",
  },
  6002: {
    code: 6002,
    message: "NoRewardsToClaim",
    userMessage: "You have no rewards available to claim.",
  },
  6003: {
    code: 6003,
    message: "UserBlacklisted",
    userMessage: "Your address has been blacklisted and cannot perform this action.",
  },
  6004: {
    code: 6004,
    message: "Unauthorized",
    userMessage: "You are not authorized to perform this action.",
  },
  6005: {
    code: 6005,
    message: "InvalidAmount",
    userMessage: "The amount entered is invalid. Please enter a valid amount.",
  },
  6006: {
    code: 6006,
    message: "MathOverflow",
    userMessage: "A calculation error occurred. Please try a smaller amount.",
  },
};

// Common Solana program errors
const SYSTEM_PROGRAM_ERRORS: Record<string, ProgramError> = {
  ACCOUNT_NOT_FOUND: {
    code: "ACCOUNT_NOT_FOUND",
    message: "Account not found",
    userMessage: "The required account was not found. Please try again.",
  },
  INVALID_ACCOUNT_DATA: {
    code: "INVALID_ACCOUNT_DATA",
    message: "Invalid account data",
    userMessage: "Invalid account data. The account may be corrupted or uninitialized.",
  },
  ACCOUNT_ALREADY_INITIALIZED: {
    code: "ACCOUNT_ALREADY_INITIALIZED",
    message: "Account already initialized",
    userMessage: "This account has already been initialized.",
  },
  INVALID_INSTRUCTION_DATA: {
    code: "INVALID_INSTRUCTION_DATA",
    message: "Invalid instruction data",
    userMessage: "Invalid transaction data. Please try again.",
  },
  PROGRAM_FAILED: {
    code: "PROGRAM_FAILED",
    message: "Program failed to execute",
    userMessage: "The transaction failed to execute. Please try again.",
  },
};

function parseProgramErrorInternal(error: unknown): ProgramError | null {
  const errorObj = error as { message?: string; logs?: string[] };
  const errorMessage = errorObj?.message || String(error);
  const logs = errorObj?.logs || [];

  // Try to extract custom program error code from message
  // Pattern: "custom program error: 0x{hex}" or "Error Code: {number}"
  const hexMatch = errorMessage.match(/custom program error: 0x([0-9a-fA-F]+)/i);
  if (hexMatch) {
    const errorCode = parseInt(hexMatch[1], 16);
    if (PROGRAM_ERRORS[errorCode]) {
      return PROGRAM_ERRORS[errorCode];
    }
    return {
      code: errorCode,
      message: `Program error ${errorCode}`,
      userMessage: `Transaction failed with error code ${errorCode}. Please try again.`,
    };
  }

  // Pattern: "Error Code: {number}"
  const decMatch = errorMessage.match(/Error Code: (\d+)/i);
  if (decMatch) {
    const errorCode = parseInt(decMatch[1], 10);
    if (PROGRAM_ERRORS[errorCode]) {
      return PROGRAM_ERRORS[errorCode];
    }
    return {
      code: errorCode,
      message: `Program error ${errorCode}`,
      userMessage: `Transaction failed with error code ${errorCode}. Please try again.`,
    };
  }

  // Check logs for program error
  for (const log of logs) {
    const logHexMatch = log.match(/custom program error: 0x([0-9a-fA-F]+)/i);
    if (logHexMatch) {
      const errorCode = parseInt(logHexMatch[1], 16);
      if (PROGRAM_ERRORS[errorCode]) {
        return PROGRAM_ERRORS[errorCode];
      }
    }
  }

  // Check for common system program errors
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes("account not found")) {
    return SYSTEM_PROGRAM_ERRORS.ACCOUNT_NOT_FOUND;
  }

  if (lowerMessage.includes("invalid account data")) {
    return SYSTEM_PROGRAM_ERRORS.INVALID_ACCOUNT_DATA;
  }

  if (lowerMessage.includes("already initialized") || lowerMessage.includes("already in use")) {
    return SYSTEM_PROGRAM_ERRORS.ACCOUNT_ALREADY_INITIALIZED;
  }

  if (lowerMessage.includes("invalid instruction")) {
    return SYSTEM_PROGRAM_ERRORS.INVALID_INSTRUCTION_DATA;
  }

  // Check for generic program failure indicators
  if (
    lowerMessage.includes("program failed") ||
    lowerMessage.includes("instruction error") ||
    lowerMessage.includes("transaction error")
  ) {
    return SYSTEM_PROGRAM_ERRORS.PROGRAM_FAILED;
  }

  return null;
}

// ============================================================================
// Main Classification Function
// ============================================================================

/**
 * Classifies any error into one of four error levels.
 * This is the unified entry point for all error handling.
 *
 * @param error - The raw error to classify
 * @returns ClassifiedError with level, parsed error info, and original error
 */
export function classifyError(error: unknown): ClassifiedError {
  if (!error) {
    return {
      level: ErrorLevel.Unknown,
      error: null,
      originalError: error,
    };
  }

  const errorObj = error as { message?: string; msg?: string };
  const errorMessage = errorObj?.message || errorObj?.msg || String(error);

  // Level 1: Check for wallet adapter errors first
  const walletError = matchWalletAdapterError(errorMessage);
  if (walletError) {
    return {
      level: ErrorLevel.WalletAdapter,
      error: walletError,
      originalError: error,
    };
  }

  // Level 2: Check for RPC/network errors
  const rpcError = matchRpcNetworkError(errorMessage);
  if (rpcError) {
    return {
      level: ErrorLevel.RpcNetwork,
      error: rpcError,
      originalError: error,
    };
  }

  // Level 3: Check for on-chain program errors
  const programError = parseProgramErrorInternal(error);
  if (programError) {
    return {
      level: ErrorLevel.OnChainProgram,
      error: programError,
      originalError: error,
    };
  }

  // Unknown error
  return {
    level: ErrorLevel.Unknown,
    error: null,
    originalError: error,
  };
}

// ============================================================================
// User-Friendly Error Functions
// ============================================================================

/**
 * Gets a user-friendly error message from any error.
 *
 * @param error - The raw error object
 * @returns A user-friendly error message string
 */
export function getUserFriendlyError(error: Error | unknown): string {
  const classified = classifyError(error);

  // If the error is classified, use its user-facing message
  if (classified.error) {
    return (
      (classified.error as WalletAdapterError | RpcNetworkError | ProgramError)
        .userMessage || classified.error.message
    );
  }

  // Handle unclassified errors
  const errorObj = error as { message?: string; msg?: string } | null;
  const errorMessage =
    errorObj?.message ||
    errorObj?.msg ||
    String(error) ||
    "An unknown error occurred. Please try again.";

  return errorMessage;
}

/**
 * Gets the appropriate title for an error based on its level.
 *
 * @param level - The error level
 * @returns A human-readable title for the error
 */
function getTitleForLevel(level: ErrorLevel): string {
  switch (level) {
    case ErrorLevel.WalletAdapter:
      return "Wallet Error";
    case ErrorLevel.RpcNetwork:
      return "Network Error";
    case ErrorLevel.OnChainProgram:
      return "Transaction Error";
    case ErrorLevel.Unknown:
    default:
      return "Error";
  }
}

/**
 * Formats an error for display in the UI.
 * This function classifies the error and returns a structure suitable for ErrorModal.
 *
 * @param error - The raw error to format
 * @returns FormattedError with title, message, optional code and level
 */
export function formatErrorForDisplay(error: unknown): FormattedError {
  const classified = classifyError(error);
  const userMessage = getUserFriendlyError(error);
  const title = getTitleForLevel(classified.level);

  const result: FormattedError = {
    title,
    message: userMessage,
    level: classified.level,
  };

  // Add error code if available
  if (classified.error?.code) {
    result.code = classified.error.code;
  }

  return result;
}
