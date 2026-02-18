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
    // Get all GlobalState accounts
    const globalStates = await program.account.globalState.all();

    if (globalStates.length === 0) {
      console.log("❌ No deployments found on this network");
      console.log(
        "\nRun 'npm run verify -- --new-tokens' to create a new deployment"
      );
      return;
    }

    console.log(`📊 Found ${globalStates.length} deployment(s):\n`);

    for (let i = 0; i < globalStates.length; i++) {
      const state = globalStates[i];
      const account = state.account;

      console.log(`Deployment #${i + 1}:`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📍 State PDA:", state.publicKey.toString());
      console.log("👤 Admin:", account.admin.toString());
      console.log("🔑 Pool ID:", account.poolId.toString());
      console.log("🪙  Staking Token:", account.stakingMint.toString());
      console.log("🎁 Reward Token:", account.rewardMint.toString());
      console.log(
        "📊 Total Staked:",
        Number(account.totalStaked) / 10 ** 9,
        "tokens"
      );
      console.log(
        "💰 Reward Per Second:",
        account.rewardPerSecond.toString(),
        "(raw units)"
      );

      // Derive vault PDAs from state PDA
      const [stakingVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("staking_vault"), state.publicKey.toBuffer()],
        program.programId
      );

      const [rewardVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("reward_vault"), state.publicKey.toBuffer()],
        program.programId
      );

      // Get vault balances
      try {
        const stakingVaultInfo = await getAccount(
          provider.connection,
          stakingVaultPda
        );
        console.log(
          "🏦 Staking Vault Balance:",
          Number(stakingVaultInfo.amount) / 10 ** 9,
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
