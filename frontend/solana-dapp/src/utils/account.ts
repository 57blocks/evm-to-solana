import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import idl from "@/idl/idl.json";
import { SolanaStaking } from "@/idl/solana_staking";
import { Program } from "@coral-xyz/anchor";

const STAKE_SEED = new Uint8Array([115, 116, 97, 107, 101]); // "stake"
const BLACKLIST_SEED = new Uint8Array([98, 108, 97, 99, 107, 108, 105, 115, 116]); // "blacklist"
const POOL_STATE_SEED = new Uint8Array([112, 111, 111, 108, 95, 115, 116, 97, 116, 101]); // "pool_state"
const STAKING_VAULT_SEED = new Uint8Array([115, 116, 97, 107, 105, 110, 103, 95, 118, 97, 117, 108, 116]); // "staking_vault"
const REWARD_VAULT_SEED = new Uint8Array([114, 101, 119, 97, 114, 100, 95, 118, 97, 117, 108, 116]); // "reward_vault"
export const createStakingAccount = async (publicKey: PublicKey, program: Program<SolanaStaking>) => {

  const programAddress = new PublicKey(idl.address);
  const [poolConfigAccount] = await program.account.poolConfig.all();
  const [poolStateAccount] = await program.account.poolState.all();
  const poolId = poolConfigAccount.account.poolId;
  const stakingMint = poolConfigAccount.account.stakingMint;
  const rewardMint = poolConfigAccount.account.rewardMint;
  const poolConfig = poolStateAccount.account.poolConfig;

  const [userStakeInfoPda] = PublicKey.findProgramAddressSync(
    [STAKE_SEED, poolConfig.toBuffer(), publicKey.toBuffer()],
    programAddress
  );
  const [blacklist] = PublicKey.findProgramAddressSync(
    [BLACKLIST_SEED, poolConfig.toBuffer(), publicKey.toBuffer()],
    programAddress
  );

  const [poolState] = PublicKey.findProgramAddressSync(
    [POOL_STATE_SEED, poolConfig.toBuffer()],
    programAddress
  );
  const [userStakeInfo] = await PublicKey.findProgramAddressSync(
    [STAKE_SEED, poolConfig.toBuffer(), publicKey.toBuffer()],
    programAddress
  );

  const [stakingVault] = PublicKey.findProgramAddressSync(
    [STAKING_VAULT_SEED, poolConfig.toBuffer()],
    programAddress
  );

  const [rewardVault] = PublicKey.findProgramAddressSync(
    [REWARD_VAULT_SEED, poolConfig.toBuffer()],
    programAddress
  );

  const userTokenAccount = await getAssociatedTokenAddress(
    stakingMint,
    publicKey
  );
  const userRewardAccount = await getAssociatedTokenAddress(
    rewardMint,
    publicKey
  );

  return {
    userStakeInfoPda,
    poolId,
    userTokenAccount,
    userRewardAccount,
    poolConfig,
    poolState,
    userStakeInfo,
    stakingVault,
    rewardVault,
    blacklistEntry: blacklist,
  };
};
