import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";

import { WalletAdapterProps } from "@solana/wallet-adapter-base";

export const createMintAccount = async (
  publicKey: PublicKey,
  sendTransaction: WalletAdapterProps["sendTransaction"],
  connection: Connection
): Promise<PublicKey> => {
  // Generate keypair to use as address of mint
  const rent = await getMinimumBalanceForRentExemptMint(connection);
  const mint = Keypair.generate();

  const createAccountInstruction = SystemProgram.createAccount({
    fromPubkey: publicKey,
    newAccountPubkey: mint.publicKey,
    space: MINT_SIZE,
    lamports: rent,
    programId: TOKEN_PROGRAM_ID,
  });

  const initializeMintInstruction = createInitializeMintInstruction(
    mint.publicKey,
    9, // Decimals
    publicKey, // Mint authority
    publicKey, // Freeze authority
    TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction().add(
    createAccountInstruction,
    initializeMintInstruction
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = publicKey;
  transaction.sign(mint);
  const signature = await sendTransaction(transaction, connection);

  await connection.confirmTransaction({
    signature: signature,
    blockhash: blockhash,
    lastValidBlockHeight: lastValidBlockHeight,
  });
  return mint.publicKey;
};
