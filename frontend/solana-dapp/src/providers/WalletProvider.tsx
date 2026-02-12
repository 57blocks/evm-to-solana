import { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { Adapter } from "@solana/wallet-adapter-base";
import { CustomWalletModalProvider } from "@/components/CustomWalletModalProvider";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TrezorWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  createBackpackMobileAdapter,
  isMobile,
} from "@/adapters";

import { SOLANA_CONFIG } from "../config/solana";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const { endpoint } = SOLANA_CONFIG;

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading
  // Only the wallets you configure here will be compiled into your application, and only the dependencies
  // of wallets that your users connect to will be loaded
  const wallets = useMemo(() => {
    const adapters: Adapter[] = [
      new TrezorWalletAdapter(),
      new LedgerWalletAdapter(),
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ];

    // Add mobile-specific adapters as fallback
    // These use deep links to open wallet apps on mobile devices
    if (isMobile()) {
      const backpackMobile = createBackpackMobileAdapter();
      if (backpackMobile) {
        adapters.push(backpackMobile);
      }
    }

    return adapters;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <CustomWalletModalProvider>{children}</CustomWalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
