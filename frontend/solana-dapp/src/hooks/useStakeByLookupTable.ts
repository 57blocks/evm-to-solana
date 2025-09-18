import { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { createStakingAccount } from "../utils/account";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { convertToLamports, ERROR_MESSAGES } from "@/utils/tokenUtils";
import {
  Connection,
  PublicKey,
  AddressLookupTableAccount,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableProgram,
  Transaction,
} from "@solana/web3.js";
import {
  AltAccountInfo,
  AltCreationParams,
  UseStakeByAltReturn,
  AltTransactionResult,
} from "../types/lookupTable";

export const useStakeByAlt = (
  onTransactionSuccess?: () => void,
  onError?: (message: string) => void
): UseStakeByAltReturn => {
  const { publicKey, signTransaction } = useWallet();
  const { program } = useProgram();
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<
    string | null
  >(null);
  const [lookupTableAddress, setLookupTableAddress] = useState<string | null>(
    null
  );
  const stakeAmountRef = useRef("");
  const altCache = useRef<AddressLookupTableAccount | null>(null);

  /**
   * Create an Address Lookup Table (ALT) for stake accounts with optimized single transaction
   * Combines both create and extend instructions into one transaction
   */
  const createStakeAlt = async (
    params: AltCreationParams
  ): Promise<AltTransactionResult> => {
    console.log("🔧 Creating Address Lookup Table (ALT) for stake accounts...");
    const { connection, payer, accounts } = params;

    const recentSlot = await connection.getSlot();

    // Create lookup table instruction
    const [lookupTableInst, altAddress] =
      AddressLookupTableProgram.createLookupTable({
        authority: payer,
        payer,
        recentSlot,
      });

    // Add accounts to lookup table instruction
    const addAccountsInst = AddressLookupTableProgram.extendLookupTable({
      payer: payer,
      authority: payer,
      lookupTable: altAddress,
      addresses: [
        accounts.state,
        accounts.userStakeInfo,
        accounts.userTokenAccount,
        accounts.stakingVault,
        accounts.rewardVault,
        accounts.userRewardAccount,
        accounts.tokenProgram,
        accounts.blacklistEntry,
        accounts.systemProgram,
        accounts.clock,
      ],
    });

    // Combine both instructions in a single transaction
    const combinedTx = new anchor.web3.Transaction()
      .add(lookupTableInst)
      .add(addAccountsInst);

    combinedTx.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    combinedTx.feePayer = payer;

    if (!signTransaction) {
      throw new Error("Wallet does not support signing transactions");
    }

    console.log(
      "📝 Signing combined Address Lookup Table (ALT) transaction..."
    );
    const signedTx = await signTransaction(combinedTx);
    const signature = await connection.sendRawTransaction(signedTx.serialize());

    console.log("⏳ Confirming transaction...");
    await connection.confirmTransaction(signature);

    console.log(
      "✅ Address Lookup Table (ALT) created and accounts added:",
      altAddress.toString()
    );
    setLookupTableAddress(altAddress.toString());

    // Fetch the created lookup table
    const lookupTableResponse = await connection.getAddressLookupTable(
      altAddress
    );
    if (!lookupTableResponse.value) {
      throw new Error("Failed to fetch lookup table");
    }
    const lookupTableAccount = lookupTableResponse.value;

    altCache.current = lookupTableAccount;

    return {
      signature,
      lookupTableAddress: altAddress.toString(),
      lookupTableAccount,
    };
  };

  /**
   * Get or create Address Lookup Table (ALT) with caching
   */
  const getOrCreateAlt = async (
    connection: Connection,
    payer: PublicKey,
    accounts: AltAccountInfo
  ): Promise<AddressLookupTableAccount> => {
    if (altCache.current) {
      console.log("♻️ Using cached Address Lookup Table (ALT)");
      return altCache.current;
    }

    const result = await createStakeAlt({
      connection,
      payer,
      accounts,
    });

    return result.lookupTableAccount;
  };

  /**
   * Create traditional stake transaction (without ALT optimization)
   * Simpler approach without Address Lookup Table complexity
   */
  const createStakeTransaction = async (
    program: any,
    accounts: AltAccountInfo & { user: PublicKey },
    amount: BN
  ): Promise<Transaction> => {
    // Create stake instruction with account information
    const stakeInstruction = await program.methods
      .stake(amount)
      .accounts({
        user: accounts.user,
        state: accounts.state,
        userStakeInfo: accounts.userStakeInfo,
        userTokenAccount: accounts.userTokenAccount,
        stakingVault: accounts.stakingVault,
        rewardVault: accounts.rewardVault,
        userRewardAccount: accounts.userRewardAccount,
        tokenProgram: accounts.tokenProgram,
        blacklistEntry: accounts.blacklistEntry,
        systemProgram: accounts.systemProgram,
        clock: accounts.clock,
      })
      .instruction();

    // Create traditional transaction
    const tx = new Transaction().add(stakeInstruction);
    tx.recentBlockhash = (
      await program.provider.connection.getLatestBlockhash()
    ).blockhash;
    tx.feePayer = accounts.user;

    return tx;
  };

  /**
   * Handle stake transaction using Address Lookup Table (ALT)
   */
  const handleStake = async () => {
    if (!publicKey || !program) {
      const errorMsg = ERROR_MESSAGES.WALLET_NOT_CONNECTED;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      const errorMsg = ERROR_MESSAGES.INVALID_STAKE_AMOUNT;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (isStaking || isButtonClicked) {
      return;
    }

    setIsButtonClicked(true);
    setIsStaking(true);
    setError(null);

    try {
      console.log("🚀 Starting Address Lookup Table (ALT) stake process...");

      // Create staking accounts
      const {
        statePda,
        userStakeInfoPda,
        blacklistPda,
        userTokenAccount,
        userRewardAccount,
      } = await createStakingAccount(publicKey);

      const state = await program.account.globalState.fetch(statePda);

      const accounts: AltAccountInfo = {
        state: statePda,
        userStakeInfo: userStakeInfoPda,
        userTokenAccount: userTokenAccount,
        stakingVault: state.stakingVault,
        rewardVault: state.rewardVault,
        userRewardAccount: userRewardAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        blacklistEntry: blacklistPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      };

      // Create traditional transaction (simpler approach)
      const tx = await createStakeTransaction(
        program,
        { ...accounts, user: publicKey },
        new BN(convertToLamports(stakeAmount))
      );

      if (!signTransaction) {
        throw new Error("Wallet does not support signing transactions");
      }

      console.log("📝 Signing stake transaction...");
      const signedTx = await signTransaction(tx);

      console.log("📤 Sending stake transaction...");
      const signature = await program.provider.connection.sendRawTransaction(
        signedTx.serialize()
      );

      console.log("⏳ Confirming stake transaction...");
      await program.provider.connection.confirmTransaction(
        signature,
        "confirmed"
      );

      console.log(
        "🎉 Address Lookup Table (ALT) stake successful! Signature:",
        signature
      );
      setTransactionSignature(signature);
      setStakeAmount("");
      stakeAmountRef.current = "";

      if (onTransactionSuccess) {
        onTransactionSuccess();
      }

      setTransactionSignature(null);
    } catch (err) {
      console.log("🚀 Starting stake process...");
      console.log("🎉 Stake successful! Signature:", signature);
      console.error("Staking failed:", err);
      const errorMessage =
        err instanceof Error ? err.message : ERROR_MESSAGES.STAKING_FAILED;
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsStaking(false);
      setIsButtonClicked(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  const isDisabled = !publicKey || isStaking || isButtonClicked;

  return {
    stakeAmount,
    isStaking,
    isButtonClicked,
    error,
    transactionSignature,
    lookupTableAddress,
    setStakeAmount,
    handleStake,
    resetError,
    isDisabled,
  };
};
