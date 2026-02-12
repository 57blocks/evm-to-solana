// Custom Wallet Adapter exports
export { CustomWalletAdapter } from "./CustomWalletAdapter";
export type { CustomWalletConfig } from "./CustomWalletAdapter";

// Utility functions
export {
  isMobile,
  isInAppBrowser,
  getCurrentUrl,
  getCurrentOrigin,
  createCustomWalletAdapter,
  createMobileWalletAdapter,
} from "./walletAdapterUtils";

// Specific wallet adapters
export {
  createBackpackWalletAdapter,
  createBackpackMobileAdapter,
} from "./BackpackWalletAdapter";
