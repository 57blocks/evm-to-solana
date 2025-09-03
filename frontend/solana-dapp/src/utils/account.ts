import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import idl from "@/idl/idl.json";

// Extract mint addresses into constants for clarity and maintainability
const STAKING_MINT_ADDRESS = "HXnRNQr25LNAxC5Z6fHyRJvUAmsenj5dkpjG3CRz4hve";
const REWARD_MINT_ADDRESS = "8JpEiC5n5QDsYd9tZyBXPQjJXwDKH9oK4s5JmhQZPrpy";

// PDA seed constants
const STATE_SEED = "state";
const STAKE_SEED = "stake";
const BLACKLIST_SEED = "blacklist";

export const createStakingAccount = async (publicKey: PublicKey) => {
  const programAddress = new PublicKey(idl.address);
  const stakingMint = new PublicKey(STAKING_MINT_ADDRESS);
  const rewardMint = new PublicKey(REWARD_MINT_ADDRESS);

  const [statePda] = PublicKey.findProgramAddressSync(
    [Buffer.from(STATE_SEED), stakingMint.toBuffer()],
    programAddress
  );

  const [userStakeInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(STAKE_SEED), statePda.toBuffer(), publicKey.toBuffer()],
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
    [Buffer.from(BLACKLIST_SEED), statePda.toBuffer(), publicKey.toBuffer()],
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
