import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { SignMessageResult, useSignMessage } from "./useSignMessage";
import { PublicKey } from "@solana/web3.js";
import { ErrorInfo } from "@/components/ErrorModal";

/**
 * Hook to automatically sign message when wallet connects
 */
export const useAutoSignOnConnect = (
  setErrorInfo: (errorInfo: ErrorInfo) => void
) => {
  const { connected, publicKey, connecting, wallet } = useWallet();
  const {
    signMessageForAuth,
    signTransactionForAuth,
    verifySignature,
    verifyTransactionSignature,
  } = useSignMessage();
  const [isSigning, setIsSigning] = useState(false);
  // Generate a sign-in message
  const generateSignInMessage = useCallback((walletAddress: PublicKey) => {
    const appName = import.meta.env.VITE_APP_NAME || "Solana Staking Platform";
    const domain = import.meta.env.VITE_APP_DOMAIN || window.location.hostname;
    const timestamp = new Date().toISOString();
    const nonce = Math.random().toString(36).substring(7);

    return `${appName} wants you to sign in with your Solana account:
    ${walletAddress.toBase58()}

    Please sign in to verify your ownership of this wallet

    URI: https://${domain}
    Version: 1
    Network: Solana
    Nonce: ${nonce}
    Issued At: ${timestamp}`;
  }, []);

  // Check if already signed in (persisted in localStorage)
  const hasSignedInSession = useCallback((publicKeyStr: string): boolean => {
    const storedSignature = localStorage.getItem("userSignature");
    const storedPublicKey = localStorage.getItem("userPublicKey");
    return !!(storedSignature && storedPublicKey === publicKeyStr);
  }, []);

  // Auto sign when wallet connects
  useEffect(() => {
    const autoSign = async () => {
      // Skip if wallet not ready
      if (!connected || connecting || !publicKey || isSigning) {
        return;
      }
      if (hasSignedInSession(publicKey.toBase58())) {
        return;
      }

      setIsSigning(true);

      try {
        const message = generateSignInMessage(publicKey);
        let result: SignMessageResult;
        const isHardwareWallet =
          wallet?.adapter.name === "Trezor" ||
          wallet?.adapter.name === "Ledger";

        if (isHardwareWallet) {
          result = await signTransactionForAuth(message);
        } else {
          result = await signMessageForAuth(message);
        }

        if (result.success) {
          // Store signature and related data in localStorage
          localStorage.setItem("userSignature", result.signature);
          localStorage.setItem("userPublicKey", result.publicKey);

          // For transaction signatures, also store the serialized message
          if (result.serializedMessage) {
            localStorage.setItem(
              "userSerializedMessage",
              result.serializedMessage
            );
          }

          // Verify the signature
          let isValid = false;
          if (isHardwareWallet && result.serializedMessage) {
            // For hardware wallets, verify the transaction signature
            isValid = verifyTransactionSignature(
              result.serializedMessage,
              result.signature,
              result.publicKey
            );
          } else {
            // For regular wallets, verify the message signature
            isValid = verifySignature(
              message,
              result.signature,
              result.publicKey
            );
          }

          if (isValid) {
            console.log("Signature verified successfully!");
          } else {
            setErrorInfo({
              title: "Signature Verification Failed",
              message: "Please try again.",
            });
          }
        }
      } catch (error) {
        setErrorInfo({
          title: "Auto Sign Failed",
          message: "Please try again.",
        });
      } finally {
        setIsSigning(false);
      }
    };
    autoSign();
  }, [
    connected,
    connecting,
    publicKey,
    isSigning,
    hasSignedInSession,
    generateSignInMessage,
    signMessageForAuth,
    signTransactionForAuth,
    verifySignature,
    verifyTransactionSignature,
    setErrorInfo,
    wallet,
  ]);
};
