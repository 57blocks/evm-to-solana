import { WalletName } from "@solana/wallet-adapter-base";
import { CustomWalletAdapter, CustomWalletConfig } from "./CustomWalletAdapter";

/**
 * A function that builds a wallet deep link URL based on the current context.
 */
type DeepLinkBuilder = () => string;

/**
 * Configuration for creating a custom wallet adapter via factory.
 */
interface WalletFactoryConfig {
  name: WalletName;
  icon: string;
  url: string;
  deepLinkBuilder: DeepLinkBuilder;
}

/**
 * Check if the user is accessing from a mobile device (iOS or Android).
 */
export const isMobile = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod|ios/i.test(ua);
  const isAndroid = /android|XiaoMi|MiuiBrowser/i.test(ua);
  return isIOS || isAndroid;
};

/**
 * Check if running in an in-app browser (wallet's built-in browser).
 */
export const isInAppBrowser = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  // Common in-app browser indicators
  return (
    ua.includes("phantom") ||
    ua.includes("solflare") ||
    ua.includes("backpack") ||
    ua.includes("glow")
  );
};

/**
 * Get the current page URL for deep link return.
 */
export const getCurrentUrl = (): string => {
  if (typeof window === "undefined") return "";
  return window.location.href;
};

/**
 * Get the current origin for deep link reference.
 */
export const getCurrentOrigin = (): string => {
  if (typeof window === "undefined") return "";
  return window.location.origin;
};

/**
 * Factory function to create a CustomWalletAdapter with the provided configuration.
 */
export function createCustomWalletAdapter(
  config: WalletFactoryConfig
): CustomWalletAdapter {
  const adapterConfig: CustomWalletConfig = {
    name: config.name,
    icon: config.icon,
    url: config.url,
    deepLink: config.deepLinkBuilder(),
  };
  return new CustomWalletAdapter(adapterConfig);
}

/**
 * Conditionally create a mobile wallet adapter.
 * Returns the adapter only on mobile devices, null otherwise.
 */
export function createMobileWalletAdapter(
  config: WalletFactoryConfig
): CustomWalletAdapter | null {
  if (!isMobile() || isInAppBrowser()) {
    return null;
  }
  return createCustomWalletAdapter(config);
}
