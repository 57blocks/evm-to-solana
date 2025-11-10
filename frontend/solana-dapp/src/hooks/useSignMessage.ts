"use client";
import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
// import nacl from "tweetnacl";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519.js";
import nacl from "tweetnacl";

export interface SignMessageResult {
  signature: string;
  publicKey: string;
  success: boolean;
}

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);
export const useSignMessage = () => {
  const { publicKey, signMessage, signTransaction } = useWallet();
  const { connection } = useConnection();

  const signMessageForAuth = useCallback(
    async (message: string): Promise<SignMessageResult> => {
      if (!publicKey || !signMessage) {
        throw new Error(
          "Wallet not connected or does not support message signing"
        );
      }
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);
      const signatureBase58 = bs58.encode(signature);
      return {
        signature: signatureBase58,
        publicKey: publicKey.toBase58(),
        success: true,
      };
    },
    [publicKey, signMessage]
  );

  const signTransactionForAuth = useCallback(
    async (message: string): Promise<SignMessageResult> => {
      if (!publicKey || !signTransaction) {
        throw new Error(
          "Wallet not connected or does not support transaction signing"
        );
      }
      const blockhashResponse = await connection.getLatestBlockhash();
      const lastValidBlockHeight = blockhashResponse.lastValidBlockHeight - 150;

      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(message, "utf-8"),
      });

      const tx = new Transaction({
        feePayer: publicKey,
        blockhash: blockhashResponse.blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
      }).add(memoInstruction);

      const signedTx = await signTransaction(tx);
      const signature = signedTx.signatures[0];
      const signatureBase58 = bs58.encode(signature.signature!);

      return {
        signature: signatureBase58,
        publicKey: publicKey.toBase58(),
        success: true,
      };
    },
    [publicKey, signTransaction, connection]
  );
  const verifySignature = useCallback(
    (message: string, signature: string, publicKeyStr: string): boolean => {
      try {
        const publicKeyObj = new PublicKey(publicKeyStr);
        const encodedMessage = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signature);
        const isValid = nacl.sign.detached.verify(
          encodedMessage,
          signatureBytes,
          publicKeyObj.toBytes()
        );
        // const isValid = ed25519.verify(
        //   signatureBytes,
        //   encodedMessage,
        //   publicKeyObj.toBytes()
        // );
        return isValid;
      } catch (err) {
        console.error("Verify signature error:", err);
        return false;
      }
    },
    []
  );

  return {
    signMessageForAuth,
    signTransactionForAuth,
    verifySignature,
  };
};
