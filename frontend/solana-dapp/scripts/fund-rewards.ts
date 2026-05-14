import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import * as fs from "fs";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import {
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

/**
 * Fund Rewards Script for Solana Staking Program
 *
 * This script:
 * 1. Mints reward tokens to the admin's token account
 * 2. Calls fund_rewards instruction to transfer them into the reward vault
 *
 * The admin wallet (pool creator) must sign the transaction.
 *
 * Usage: npx tsx scripts/fund-rewards.ts
 */

const WALLET_PATH = `${process.env.HOME}/.config/solana/id.json`;
const REWARD_VAULT_SEED = Buffer.from("reward_vault");

async function main() {
  console.log("Starting reward vault funding process...\n");

  // Load admin wallet from Solana CLI config
  const walletPrivateKey: number[] = JSON.parse(
    fs.readFileSync(WALLET_PATH, "utf8")
  );
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletPrivateKey));

  const connection = new Connection(
    "https://api.testnet.solana.com",
    "confirmed"
  );

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  console.log("Admin wallet:", wallet.publicKey.toBase58());

  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

  // Load IDL and deployment info
  const idl = JSON.parse(
    fs.readFileSync("../../contract/solana-staking/target/idl/solana_staking.json", "utf8")
  );
  const deploymentInfo = JSON.parse(
    fs.readFileSync("./scripts/deployment-info.json", "utf8")
  );

  const program = new anchor.Program(idl, provider);
  const poolConfigPda = new PublicKey(deploymentInfo.poolConfigPda);
  const rewardMint = new PublicKey(deploymentInfo.rewardMint);
  const programId = new PublicKey(deploymentInfo.programId);

  // Derive reward vault PDA
  const [rewardVault] = PublicKey.findProgramAddressSync(
    [REWARD_VAULT_SEED, poolConfigPda.toBuffer()],
    programId
  );

  console.log("\nPool Config:", poolConfigPda.toBase58());
  console.log("Reward Mint:", rewardMint.toBase58());
  console.log("Reward Vault:", rewardVault.toBase58());

  const FUND_AMOUNT = 10_000; // 10,000 reward tokens
  const FUND_AMOUNT_LAMPORTS = BigInt(FUND_AMOUNT) * BigInt(10 ** 9);

  try {
    // Step 1: Mint reward tokens to admin's token account
    console.log(`\nStep 1: Minting ${FUND_AMOUNT} reward tokens to admin...`);

    const adminRewardAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      rewardMint,
      wallet.publicKey
    );

    await mintTo(
      connection,
      wallet,
      rewardMint,
      adminRewardAccount.address,
      wallet.publicKey, // mint authority
      FUND_AMOUNT_LAMPORTS
    );

    console.log("Minted to admin account:", adminRewardAccount.address.toBase58());

    // Step 2: Call fund_rewards to transfer into reward vault
    console.log(`\nStep 2: Funding reward vault with ${FUND_AMOUNT} tokens...`);

    const txSignature = await (program.methods as any)
      .fundRewards(new BN(FUND_AMOUNT_LAMPORTS.toString()))
      .accountsPartial({
        admin: wallet.publicKey,
        poolConfig: poolConfigPda,
        adminRewardAccount: adminRewardAccount.address,
        rewardVault: rewardVault,
      })
      .rpc();

    console.log("Fund rewards tx:", txSignature);

    // Verify vault balance
    const vaultBalance = await connection.getTokenAccountBalance(rewardVault);
    console.log("\nReward vault balance:", vaultBalance.value.uiAmountString, "tokens");

    console.log("\nReward vault funded successfully!");
  } catch (error) {
    console.error("Fund rewards failed:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nFailed:", error);
    process.exit(1);
  });
