import { WalletName } from "@solana/wallet-adapter-base";
import { CustomWalletAdapter } from "./CustomWalletAdapter";
import {
  createCustomWalletAdapter,
  isMobile,
  getCurrentUrl,
} from "./walletAdapterUtils";

// Binance Web3 Wallet icon
const BINANCE_ICON =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIHJ4PSIyNCIgZmlsbD0iIzFBMUExQSIvPjxwYXRoIGQ9Ik02NCAzMkw0OCA0OEw1NiA1Nkw2NCA0OEw3MiA1Nkw4MCA0OEw2NCAzMloiIGZpbGw9IiNGM0JBMkYiLz48cGF0aCBkPSJNMzIgNjRMNDggNDhMNTYgNTZMNDAgNzJMNTYgODhMNDggOTZMMzIgODBMNDAgNzJMMzIgNjRaIiBmaWxsPSIjRjNCQTJGIi8+PHBhdGggZD0iTTk2IDY0TDgwIDQ4TDcyIDU2TDg4IDcyTDcyIDg4TDgwIDk2TDk2IDgwTDg4IDcyTDk2IDY0WiIgZmlsbD0iI0YzQkEyRiIvPjxwYXRoIGQ9Ik02NCA5Nkw0OCA4MEw1NiA3Mkw2NCA4MEw3MiA3Mkw4MCA4MEw2NCA5NloiIGZpbGw9IiNGM0JBMkYiLz48cGF0aCBkPSJNNjQgNTZMNTYgNjRMNjQgNzJMNzIgNjRMNjQgNTZaIiBmaWxsPSIjRjNCQTJGIi8+PC9zdmc+";

const BINANCE_URL = "https://www.binance.com/en/web3wallet";

/**
 * Build the Binance Web3 Wallet deep link URL for mobile.
 * Uses the Binance app's dapp browser deep link format.
 */
const buildBinanceDeepLink = (): string => {
  const currentUrl = getCurrentUrl();

  // Binance app deep link format for opening DApps
  // Format: https://app.binance.com/cedefi/dapp-webview?url=<encoded_url>
  return `https://app.binance.com/cedefi/dapp-webview?url=${encodeURIComponent(currentUrl)}`;
};

/**
 * Create a Binance Web3 Wallet adapter.
 *
 * On mobile: Uses deep link to open Binance app's DApp browser
 * On desktop: Redirects to Binance Web3 Wallet page
 */
export function createBinanceWalletAdapter(): CustomWalletAdapter {
  return createCustomWalletAdapter({
    name: "Binance" as WalletName<"Binance">,
    icon: BINANCE_ICON,
    url: BINANCE_URL,
    deepLinkBuilder: () => (isMobile() ? buildBinanceDeepLink() : BINANCE_URL),
  });
}

/**
 * Create Binance adapter only for mobile devices.
 * Returns null on desktop.
 */
export function createBinanceMobileAdapter(): CustomWalletAdapter | null {
  if (!isMobile()) {
    return null;
  }
  return createBinanceWalletAdapter();
}
