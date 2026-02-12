import { createContext, useContext } from "react";

export interface WalletModalContextState {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

export const WalletModalContext = createContext<WalletModalContextState>({
  visible: false,
  setVisible: () => {},
});

export const useWalletModal = () => useContext(WalletModalContext);
