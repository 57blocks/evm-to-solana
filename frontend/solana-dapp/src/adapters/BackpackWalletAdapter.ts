import { WalletName } from "@solana/wallet-adapter-base";
import { CustomWalletAdapter } from "./CustomWalletAdapter";
import {
  createCustomWalletAdapter,
  isMobile,
  getCurrentUrl,
  getCurrentOrigin,
} from "./walletAdapterUtils";

// Backpack wallet icon (base64 encoded or URL)
const BACKPACK_ICON =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iNjQiIGZpbGw9IiNFMzM0MzQiLz4KPHBhdGggZD0iTTY0IDk2QzgxLjY3MzEgOTYgOTYgODEuNjczMSA5NiA2NEM5NiA0Ni4zMjY5IDgxLjY3MzEgMzIgNjQgMzJDNDYuMzI2OSAzMiAzMiA0Ni4zMjY5IDMyIDY0QzMyIDgxLjY3MzEgNDYuMzI2OSA5NiA2NCA5NloiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=";

const BACKPACK_URL = "https://backpack.app";
const BACKPACK_CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/backpack/aflkmfhebedbjioipglgcbcmnbpgliof";

/**
 * Build the Backpack deep link URL for mobile.
 * Uses Universal Link format for iOS/Android.
 */
const buildBackpackDeepLink = (): string => {
  const currentUrl = getCurrentUrl();
  const origin = getCurrentOrigin();

  // Backpack Universal Link format
  return `https://backpack.app/ul/v1/browse/${encodeURIComponent(
    currentUrl
  )}?ref=${encodeURIComponent(origin)}`;
};

/**
 * Create a Backpack wallet adapter.
 *
 * On mobile: Uses deep link to open Backpack app
 * On desktop: Redirects to Chrome extension installation page
 */
export function createBackpackWalletAdapter(): CustomWalletAdapter {
  return createCustomWalletAdapter({
    name: "Backpack" as WalletName<"Backpack">,
    icon: BACKPACK_ICON,
    url: BACKPACK_URL,
    deepLinkBuilder: () =>
      isMobile() ? buildBackpackDeepLink() : BACKPACK_CHROME_EXTENSION_URL,
  });
}

/**
 * Create Backpack adapter only for mobile devices.
 * Returns null on desktop (where the official adapter should be used).
 */
export function createBackpackMobileAdapter(): CustomWalletAdapter | null {
  if (!isMobile()) {
    return null;
  }
  return createBackpackWalletAdapter();
}
