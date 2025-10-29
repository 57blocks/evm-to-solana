"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSignMessage } from "./useSignMessage";

/**
 * Hook to automatically sign message when wallet connects
 * Uses "use client" directive to ensure client-side only execution
 */
export const useAutoSignOnConnect = () => {
  const { connected, publicKey, connecting, wallet } = useWallet();
  const { signMessageForAuth, loading, verifySignature } = useSignMessage();
  const [isSigning, setIsSigning] = useState(false);
  // Generate a sign-in message
  const generateSignInMessage = useCallback((walletAddress: string) => {
    const appName = process.env.NEXT_PUBLIC_APP_NAME;
    const domain = process.env.NEXT_PUBLIC_APP_DOMAIN;
    const timestamp = new Date().toISOString();
    const nonce = Math.random().toString(36).substring(7);

    return `${appName} wants you to sign in with your Solana account:
    ${walletAddress}

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
        const message = generateSignInMessage(publicKey.toBase58());
        const result = await signMessageForAuth(message);

        if (result.success) {
          // Store signature in localStorage (persists across browser sessions)
          localStorage.setItem("userSignature", result.signature);
          localStorage.setItem("userPublicKey", result.publicKey);

          // Simulate backend verification using TweetNaCl
          const isValid = verifySignature(
            message,
            result.signature,
            result.publicKey
          );

          if (isValid) {
            console.log("Signature verified successfully!");
          } else {
            console.error("Signature verification failed!");
          }
        }
      } catch (error) {
        console.error("Auto sign failed:", error);
      } finally {
        setIsSigning(false);
      }
    };
    autoSign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, connecting, publicKey, isSigning]);

  return {
    isSigning: isSigning || loading,
  };
};
