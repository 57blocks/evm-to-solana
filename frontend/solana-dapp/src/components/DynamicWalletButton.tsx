import dynamic from "next/dynamic";
import { FC } from "react";

// Dynamically import the wallet button to prevent SSR issues
const WalletButton = dynamic(() => import("./WalletButton"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        padding: "12px 24px",
        borderRadius: "8px",
        fontSize: "1rem",
        fontWeight: 600,
        cursor: "pointer",
        minWidth: "200px",
        textAlign: "center",
      }}
    >
      Loading...
    </div>
  ),
});

const DynamicWalletButton: FC = () => <WalletButton />;

export default DynamicWalletButton;
