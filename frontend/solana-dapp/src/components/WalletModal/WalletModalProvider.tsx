import { useState, useCallback, useEffect, ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletModal } from "./WalletModal";
import { WalletModalContext } from "./useWalletModal";
import { CustomWalletAdapter } from "@/adapters";

// localStorage key used by @solana/wallet-adapter-react
const WALLET_NAME_STORAGE_KEY = "walletName";

interface WalletModalProviderProps {
  children: ReactNode;
}

export const WalletModalProvider: React.FC<WalletModalProviderProps> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const { wallet, connected, connecting, disconnect, select } = useWallet();

  // On mount, check for stuck deep link wallet and clear it
  useEffect(() => {
    const isDeepLinkAdapter = wallet?.adapter instanceof CustomWalletAdapter;

    // If a deep link wallet is selected but not connected, clear it
    // This handles the case where user returned from a failed deep link
    if (isDeepLinkAdapter && !connected && !connecting) {
      const timer = setTimeout(async () => {
        try {
          await disconnect();
        } catch {
          // Ignore errors
        }
        select(null);
        localStorage.removeItem(WALLET_NAME_STORAGE_KEY);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [wallet, connected, connecting, disconnect, select]);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <WalletModalContext.Provider value={{ visible, setVisible }}>
      {children}
      <WalletModal visible={visible} onClose={handleClose} />
    </WalletModalContext.Provider>
  );
};
