import { Address, getProgramDerivedAddress, KeyPairSigner } from "@solana/kit";
import { Connection, PublicKey } from "@solana/web3.js";
import { createMintAccount } from "./createMintAccount";
import idl from "@/idl/idl.json";
import { WalletAdapterProps } from "@solana/wallet-adapter-base";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

export const createStakingAccount = async (
  publicKey: PublicKey,
  sendTransaction: WalletAdapterProps["sendTransaction"],
  connection: Connection
) => {
  const programAddress = new PublicKey(idl.address);
  const stakingMint = await createMintAccount(
    publicKey,
    sendTransaction,
    connection
  );
  const rewardMint = await createMintAccount(
    publicKey,
    sendTransaction,
    connection
  );
  //TODO: need to check stakingMint is valid
  const [statePda] = await PublicKey.findProgramAddressSync(
    [Buffer.from("state"), stakingMint.toBuffer()],
    programAddress
  );

  const [stakingVaultPda] = await PublicKey.findProgramAddressSync(
    [Buffer.from("staking_vault"), statePda.toBuffer()],
    programAddress
  );

  const [rewardVaultPda] = await PublicKey.findProgramAddressSync(
    [Buffer.from("reward_vault"), statePda.toBuffer()],
    programAddress
  );
  const [userStakeInfoPda] = await PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), statePda.toBuffer(), publicKey.toBuffer()],
    programAddress
  );
  const [blacklistPda] = await PublicKey.findProgramAddressSync(
    [Buffer.from("blacklist"), statePda.toBuffer(), publicKey.toBuffer()],
    programAddress
  );

  const stakingTokenAccount = getAssociatedTokenAddressSync(
    stakingMint,
    publicKey
  );
  const rewardTokenAccount = getAssociatedTokenAddressSync(
    rewardMint,
    publicKey
  );
  return {
    stakingMint,
    rewardMint,
    statePda,
    stakingVaultPda,
    rewardVaultPda,
    userStakeInfoPda,
    blacklistPda,
    stakingTokenAccount,
    rewardTokenAccount,
  };
};
