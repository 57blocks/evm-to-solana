import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import idl from "@/idl/idl.json";

// Extract mint addresses into constants for clarity and maintainability
// These must match the deployed tokens in deployment-info.json
const STAKING_MINT_ADDRESS = "GHpr1Ry8HF1zUpRPp9juQWK9yXyGPXaVmgGuA2UMokV1";
const REWARD_MINT_ADDRESS = "BAHDWzvohjo3cj8HDXJ397SL4pcRhABQkGYZxA1sNrqS";

// PDA seed constants (UTF-8 byte arrays) from idl.json
const STATE_SEED = new Uint8Array([115, 116, 97, 116, 101]); // "state"
const STAKE_SEED = new Uint8Array([115, 116, 97, 107, 101]); // "stake"
const BLACKLIST_SEED = new Uint8Array([
  98, 108, 97, 99, 107, 108, 105, 115, 116,
]); // "blacklist"

export const createStakingAccount = async (publicKey: PublicKey) => {
  const programAddress = new PublicKey(idl.address);
  const stakingMint = new PublicKey(STAKING_MINT_ADDRESS);
  const rewardMint = new PublicKey(REWARD_MINT_ADDRESS);

  const [statePda] = PublicKey.findProgramAddressSync(
    [STATE_SEED, stakingMint.toBuffer()],
    programAddress
  );
  const [userStakeInfoPda] = PublicKey.findProgramAddressSync(
    [STAKE_SEED, statePda.toBuffer(), publicKey.toBuffer()],
    programAddress
  );
  const [blacklistPda] = PublicKey.findProgramAddressSync(
    [BLACKLIST_SEED, statePda.toBuffer(), publicKey.toBuffer()],
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
  return {
    statePda,
    userStakeInfoPda,
    blacklistPda,
    userTokenAccount,
    userRewardAccount,
  };
};
