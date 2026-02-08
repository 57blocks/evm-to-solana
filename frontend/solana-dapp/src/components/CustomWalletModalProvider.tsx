import { ReactNode } from "react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

interface CustomWalletModalProviderProps {
  children: ReactNode;
}

export const CustomWalletModalProvider: React.FC<
  CustomWalletModalProviderProps
> = ({ children }) => {
  return <WalletModalProvider>{children}</WalletModalProvider>;
};
