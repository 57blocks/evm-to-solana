import { ReactNode } from "react";
import { WalletModalProvider } from "./WalletModal";

interface CustomWalletModalProviderProps {
  children: ReactNode;
}

export const CustomWalletModalProvider: React.FC<
  CustomWalletModalProviderProps
> = ({ children }) => {
  return <WalletModalProvider>{children}</WalletModalProvider>;
};
