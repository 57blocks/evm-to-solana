import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { sepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Stake App",
  projectId: "EVM-DAPP",
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(import.meta.env.VITE_RPC_URL || ""),
  },
});
