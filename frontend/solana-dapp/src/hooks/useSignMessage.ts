"use client";
import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
// import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519.js";

export interface SignMessageResult {
  signature: string;
  publicKey: string;
  success: boolean;
  error?: string;
}

export const useSignMessage = () => {
  const { publicKey, signMessage } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signMessageForAuth = useCallback(
    async (message: string): Promise<SignMessageResult> => {
      if (!publicKey || !signMessage) {
        const errorMsg =
          "Wallet not connected or does not support message signing";
        setError(errorMsg);
        return {
          signature: "",
          publicKey: "",
          success: false,
          error: errorMsg,
        };
      }

      setLoading(true);
      setError(null);
      try {
        const encodedMessage = new TextEncoder().encode(message);
        const signature = await signMessage(encodedMessage);
        const signatureBase58 = bs58.encode(signature);
        setLoading(false);
        return {
          signature: signatureBase58,
          publicKey: publicKey.toBase58(),
          success: true,
        };
      } catch (err: any) {
        console.error("Sign message error:", err);
        const errorMsg = err.message || "Failed to sign message";
        setError(errorMsg);
        setLoading(false);
        return {
          signature: "",
          publicKey: "",
          success: false,
          error: errorMsg,
        };
      }
    },
    [publicKey, signMessage]
  );
  const verifySignature = useCallback(
    (message: string, signature: string, publicKeyStr: string): boolean => {
      try {
        const publicKeyObj = new PublicKey(publicKeyStr);
        const encodedMessage = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signature);
        // const isValid = nacl.sign.detached.verify(
        //   encodedMessage,
        //   signatureBytes,
        //   publicKeyObj.toBytes()
        // );
        const isValid = ed25519.verify(
          signatureBytes,
          encodedMessage,
          publicKeyObj.toBytes()
        );
        return isValid;
      } catch (err) {
        console.error("Verify signature error:", err);
        return false;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signMessageForAuth,
    verifySignature,
    loading,
    error,
    clearError,
  };
};
