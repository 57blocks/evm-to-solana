import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "./WalletModal";

const WalletConnect: React.FC = () => {
  const { publicKey, connected, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const handleClick = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all"
      style={{ backgroundColor: "#667eea" }}
    >
      {connecting ? (
        "Connecting..."
      ) : connected && publicKey ? (
        <>
          <span className="w-2 h-2 bg-green-400 rounded-full" />
          {formatAddress(publicKey.toBase58())}
        </>
      ) : (
        "Select Wallet"
      )}
    </button>
  );
};

export default WalletConnect;
