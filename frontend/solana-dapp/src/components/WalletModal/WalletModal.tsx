import { useCallback, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, WalletName } from "@solana/wallet-adapter-base";
import { CustomWalletAdapter } from "@/adapters";
import "./WalletModal.css";

interface WalletModalProps {
  visible: boolean;
  onClose: () => void;
}

// localStorage key used by @solana/wallet-adapter-react
const WALLET_NAME_STORAGE_KEY = "walletName";

export const WalletModal: React.FC<WalletModalProps> = ({
  visible,
  onClose,
}) => {
  const { wallets, select, disconnect, wallet, connected } = useWallet();
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [visible, onClose]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [visible, onClose]);

  // Lock body scroll when modal is visible
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  // Prevent touch scroll on overlay and handle scroll boundaries
  useEffect(() => {
    const overlay = overlayRef.current;
    const modal = modalRef.current;
    if (!overlay || !visible) return;

    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const preventScroll = (e: TouchEvent) => {
      // If touch is outside modal, prevent scrolling
      if (!modal?.contains(e.target as Node)) {
        e.preventDefault();
        return;
      }

      // Find the scrollable content element
      const content = modal.querySelector(".wallet-modal-content") as HTMLElement;
      if (!content) {
        e.preventDefault();
        return;
      }

      const currentY = e.touches[0].clientY;
      const deltaY = startY - currentY;
      const { scrollTop, scrollHeight, clientHeight } = content;

      // At top and trying to scroll up
      if (scrollTop <= 0 && deltaY < 0) {
        e.preventDefault();
        return;
      }

      // At bottom and trying to scroll down
      if (scrollTop + clientHeight >= scrollHeight && deltaY > 0) {
        e.preventDefault();
        return;
      }
    };

    overlay.addEventListener("touchstart", handleTouchStart, { passive: true });
    overlay.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      overlay.removeEventListener("touchstart", handleTouchStart);
      overlay.removeEventListener("touchmove", preventScroll);
    };
  }, [visible]);

  // Clear any stuck wallet selection
  const clearWalletSelection = useCallback(async () => {
    try {
      await disconnect();
    } catch {
      // Ignore errors
    }
    select(null);
    localStorage.removeItem(WALLET_NAME_STORAGE_KEY);
  }, [disconnect, select]);

  const handleWalletClick = useCallback(
    async (walletName: WalletName) => {
      const selectedWallet = wallets.find((w) => w.adapter.name === walletName);
      if (!selectedWallet) return;

      const isDeepLinkAdapter =
        selectedWallet.adapter instanceof CustomWalletAdapter;

      // If switching from another wallet, disconnect first
      if (wallet && wallet.adapter.name !== walletName) {
        await clearWalletSelection();
      }

      // For deep link adapters, don't store in localStorage
      // They will redirect and the user won't come back to this browser
      if (isDeepLinkAdapter) {
        localStorage.removeItem(WALLET_NAME_STORAGE_KEY);
      }

      // Select and connect
      select(walletName);
      onClose();

      // For non-deep-link wallets, try to connect
      // Deep link adapters will handle redirect in their connect() method
      if (!isDeepLinkAdapter) {
        try {
          await selectedWallet.adapter.connect();
        } catch {
          // Connection might fail, that's ok
        }
      }
    },
    [wallets, wallet, select, onClose, clearWalletSelection]
  );

  // Get all displayable wallets (installed/loadable + deep link adapters)
  const displayWallets = wallets.filter(
    (w) =>
      w.readyState === WalletReadyState.Installed ||
      w.readyState === WalletReadyState.Loadable ||
      w.adapter instanceof CustomWalletAdapter
  );

  if (!visible) return null;

  return (
    <div className="wallet-modal-overlay" ref={overlayRef}>
      <div className="wallet-modal" ref={modalRef}>
        <div className="wallet-modal-header">
          <h2>Connect Wallet</h2>
          <button className="wallet-modal-close" onClick={onClose}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1L13 13M1 13L13 1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="wallet-modal-content">
          {displayWallets.length > 0 ? (
            <div className="wallet-list">
              {displayWallets.map((w) => {
                const isDeepLink = w.adapter instanceof CustomWalletAdapter;
                const isConnected = connected && wallet?.adapter.name === w.adapter.name;

                return (
                  <button
                    key={w.adapter.name}
                    className={`wallet-item ${isConnected ? "wallet-item-connected" : ""}`}
                    onClick={() => handleWalletClick(w.adapter.name)}
                  >
                    <div className="wallet-icon-wrapper">
                      <img
                        src={w.adapter.icon}
                        alt={w.adapter.name}
                        className="wallet-icon"
                      />
                    </div>
                    <span className="wallet-name">{w.adapter.name}</span>
                    {isConnected && (
                      <span className="wallet-badge wallet-badge-connected">
                        Connected
                      </span>
                    )}
                    {!isConnected && isDeepLink && w.adapter.name !== "Backpack" && (
                      <span className="wallet-badge">Open App</span>
                    )}
                    {!isConnected && !isDeepLink && w.readyState === WalletReadyState.Installed && (
                      <span className="wallet-badge">Detected</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="wallet-empty">
              <p>No wallets found.</p>
              <p>Please install a Solana wallet extension.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
