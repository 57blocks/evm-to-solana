import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import idl from "@/idl/idl.json";

export const createStakingAccount = async (publicKey: PublicKey) => {
  const programAddress = new PublicKey(idl.address); // Updated with actual deployed mint addresses
  const stakingMint = new PublicKey(
    "HXnRNQr25LNAxC5Z6fHyRJvUAmsenj5dkpjG3CRz4hve"
  );
  const rewardMint = new PublicKey(
    "8JpEiC5n5QDsYd9tZyBXPQjJXwDKH9oK4s5JmhQZPrpy"
  );
  const [statePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("state"), stakingMint.toBuffer()],
    programAddress
  );

  const [userStakeInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), statePda.toBuffer(), publicKey.toBuffer()],
    programAddress
  );

  const userTokenAccount = getAssociatedTokenAddressSync(
    stakingMint,
    publicKey
  );

  const userRewardAccount = getAssociatedTokenAddressSync(
    rewardMint,
    publicKey
  );

  const [blacklistPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("blacklist"), statePda.toBuffer(), publicKey.toBuffer()],
    programAddress
  );
  return {
    statePda,
    userStakeInfoPda,
    blacklistPda,
    userTokenAccount,
    userRewardAccount,
  };
};
