import { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { CustomWalletModalProvider } from "@/components/CustomWalletModalProvider";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TrezorWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";

import { SOLANA_CONFIG } from "../config/solana";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";
import {
  BackpackWalletAdapter,
  OKXWalletAdapter,
  BinanceWalletAdapter,
} from "@/components/CustomWallets/CustomWallet";

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  const { endpoint } = SOLANA_CONFIG;

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading
  // Only the wallets you configure here will be compiled into your application, and only the dependencies
  // of wallets that your users connect to will be loaded
  const wallets = useMemo(
    () => [
      new TrezorWalletAdapter(),
      new LedgerWalletAdapter(),
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      BinanceWalletAdapter(),
      OKXWalletAdapter(),
      BackpackWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <CustomWalletModalProvider>{children}</CustomWalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
