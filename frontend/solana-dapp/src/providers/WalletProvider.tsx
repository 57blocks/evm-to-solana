import React, { FC, ReactNode } from "react";

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  return <div>{children}</div>;
};
