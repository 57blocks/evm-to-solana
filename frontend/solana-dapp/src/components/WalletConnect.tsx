import { useEffect, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletMultiButton,
  useWalletModal,
} from "@solana/wallet-adapter-react-ui";
import { CustomWalletAdapter } from "@/adapters";

// localStorage key used by @solana/wallet-adapter-react
const WALLET_NAME_STORAGE_KEY = "walletName";

const WalletConnect: React.FC = () => {
  const { wallet, disconnect, connected, connecting, select } = useWallet();
  const { setVisible } = useWalletModal();
  const hasCheckedStuckState = useRef(false);

  // Check if the selected wallet is a deep link adapter
  const isDeepLinkAdapter = wallet?.adapter instanceof CustomWalletAdapter;

  // Clear wallet selection completely (including localStorage)
  const clearWalletSelection = useCallback(async () => {
    try {
      await disconnect();
    } catch {
      // Ignore disconnect errors
    }
    select(null);
    // Also clear localStorage to prevent auto-reconnect on next page load
    localStorage.removeItem(WALLET_NAME_STORAGE_KEY);
  }, [disconnect, select]);

  // On mount, check if there's a stuck deep link wallet
  // Deep link wallets can't auto-connect, so clear them on page load
  useEffect(() => {
    if (hasCheckedStuckState.current) return;
    hasCheckedStuckState.current = true;

    // Check after a delay to let wallet adapter initialize
    const timer = setTimeout(() => {
      // Only clear if it's a deep link adapter that isn't connected
      if (isDeepLinkAdapter && !connected && !connecting) {
        clearWalletSelection();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isDeepLinkAdapter, connected, connecting, clearWalletSelection]);

  const handleReselect = async () => {
    await clearWalletSelection();
    // Small delay to ensure state is cleared
    setTimeout(() => setVisible(true), 100);
  };

  // If a deep link wallet is selected but not connected, show re-select button
  if (isDeepLinkAdapter && !connected && !connecting) {
    return (
      <button
        onClick={handleReselect}
        className="wallet-adapter-button wallet-adapter-button-trigger"
        style={{ backgroundColor: "#667eea" }}
      >
        Select Wallet
      </button>
    );
  }

  return <WalletMultiButton className="!bg-[#667eea] hover:!bg-[#5a6fe0]" />;
};

export default WalletConnect;
