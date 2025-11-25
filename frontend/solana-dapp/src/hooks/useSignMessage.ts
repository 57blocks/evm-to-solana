import { useCallback } from "react";
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
  // For transaction signatures, we need to store the serialized message that was signed
  serializedMessage?: string; // base58 encoded
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

      // Sign the transaction
      const signedTx = await signTransaction(tx);

      // Get the signature from the signed transaction
      const txSignature = signedTx.signatures[0];
      const signatureBase58 = bs58.encode(txSignature.signature!);

      // Get the serialized message that was actually signed
      // This is what the wallet signed - the serialized transaction data
      const serializedMessage = signedTx.serializeMessage();
      const serializedMessageBase58 = bs58.encode(serializedMessage);

      return {
        signature: signatureBase58,
        publicKey: publicKey.toBase58(),
        success: true,
        serializedMessage: serializedMessageBase58,
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
        return isValid;
      } catch (err) {
        console.error("Verify signature error:", err);
        return false;
      }
    },
    []
  );

  /**
   * Verify a transaction signature
   * @param serializedMessageBase58 - The base58 encoded serialized transaction message that was signed
   * @param signature - The base58 encoded signature
   * @param publicKeyStr - The base58 encoded public key
   * @returns true if the signature is valid
   */
  const verifyTransactionSignature = useCallback(
    (
      serializedMessageBase58: string,
      signature: string,
      publicKeyStr: string
    ): boolean => {
      try {
        const publicKeyObj = new PublicKey(publicKeyStr);
        const signatureBytes = bs58.decode(signature);
        const messageBytes = bs58.decode(serializedMessageBase58);

        // Verify the signature using nacl
        // const isValid = nacl.sign.detached.verify(
        //   messageBytes,
        //   signatureBytes,
        //   publicKeyObj.toBytes()
        // );
        const isValid = ed25519.verify(
          signatureBytes,
          messageBytes,
          publicKeyObj.toBytes()
        );
        return isValid;
      } catch (err) {
        console.error("Verify transaction signature error:", err);
        return false;
      }
    },
    []
  );

  return {
    signMessageForAuth,
    signTransactionForAuth,
    verifySignature,
    verifyTransactionSignature,
  };
};
