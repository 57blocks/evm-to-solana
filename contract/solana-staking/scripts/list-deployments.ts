import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";

// Import IDL types
import type { SolanaStaking } from "../target/types/solana_staking";

// Program ID
const PROGRAM_ID = new PublicKey(
  "EDgQa4GCRN8Xz6UYtMBxyVDcv7PyJ7NgMTcWHzqgcnpX"
);

async function main() {
  console.log("🔍 Listing all Solana Staking deployments...\n");

  // Setup Provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load IDL
  const idl = JSON.parse(
    fs.readFileSync("./target/idl/solana_staking.json", "utf8")
  );

  // Create program instance
  if (!idl.address) {
    idl.address = PROGRAM_ID.toString();
  }

  const program = new Program<SolanaStaking>(idl as any, provider);

  try {
    // Get all PoolConfig accounts
    const poolConfigs = await program.account.poolConfig.all();

    if (poolConfigs.length === 0) {
      console.log("❌ No deployments found on this network");
      console.log(
        "\nRun 'npm run verify -- --new-tokens' to create a new deployment"
      );
      return;
    }

    console.log(`📊 Found ${poolConfigs.length} deployment(s):\n`);

    for (let i = 0; i < poolConfigs.length; i++) {
      const poolConfig = poolConfigs[i];
      const account = poolConfig.account;
      const [poolStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool_state"), poolConfig.publicKey.toBuffer()],
        program.programId
      );

      console.log(`Deployment #${i + 1}:`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📍 Pool Config PDA:", poolConfig.publicKey.toString());
      console.log("📍 Pool State PDA:", poolStatePda.toString());
      console.log("👤 Admin:", account.admin.toString());
      console.log("🔑 Pool ID:", account.poolId.toString());
      console.log("🪙  Staking Token:", account.stakingMint.toString());
      console.log("🎁 Reward Token:", account.rewardMint.toString());
      console.log(
        "💰 Reward Per Second:",
        account.rewardPerSecond.toString(),
        "(raw units)"
      );

      // Get pool state for mutable fields
      let totalStaked = "Unable to fetch";
      try {
        const poolState = await program.account.poolState.fetch(poolStatePda);
        totalStaked = (Number(poolState.totalStaked) / 10 ** 9).toString();
      } catch (e) {
        totalStaked = "Unable to fetch";
      }
      console.log(
        "📊 Total Staked:",
        totalStaked === "Unable to fetch"
          ? totalStaked
          : `${totalStaked} tokens`
      );

      // Derive vault PDAs from pool config PDA
      const [stakingTokenPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("staking_token"), poolConfig.publicKey.toBuffer()],
        program.programId
      );

      const [rewardVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("reward_vault"), poolConfig.publicKey.toBuffer()],
        program.programId
      );

      // Get vault balances
      try {
        const stakingTokenInfo = await getAccount(
          provider.connection,
          stakingTokenPda
        );
        console.log(
          "🏦 Staking Vault Balance:",
          Number(stakingTokenInfo.amount) / 10 ** 9,
          "tokens"
        );
      } catch (e) {
        console.log("🏦 Staking Vault Balance: Unable to fetch");
      }

      try {
        const rewardVaultInfo = await getAccount(
          provider.connection,
          rewardVaultPda
        );
        console.log(
          "🏦 Reward Vault Balance:",
          Number(rewardVaultInfo.amount) / 10 ** 9,
          "tokens"
        );
      } catch (e) {
        console.log("🏦 Reward Vault Balance: Unable to fetch");
      }

      console.log();
    }

    console.log("\n💡 Tips:");
    console.log("- The verify script will use the first deployment by default");
    console.log(
      "- Use 'npm run verify -- --new-tokens' to create a new deployment"
    );
    console.log(
      "- Save the token addresses if you need to use them in other scripts"
    );
  } catch (error) {
    console.error("❌ Error listing deployments:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script execution failed:", error);
    process.exit(1);
  });
