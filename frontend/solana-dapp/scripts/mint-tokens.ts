import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { mintTo, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

/**
 * Token Minting Script for Solana Staking Program
 *
 * This script mints both staking and reward tokens to a specified target wallet
 * on the Solana devnet. It uses a wallet's private key to perform the minting
 * operations and requires sufficient SOL balance for transaction fees.
 *
 * Prerequisites:
 * - The wallet must have sufficient SOL for transaction fees（44fgvGQjJuwiuw4fofNPsmwDFqZsBJBGjHH8V2Td6HdY）
 *
 * Usage:
 * 1. Update TARGET_WALLET with the desired recipient address
 * 2. Run: node scripts/mint-tokens.ts
 *
 * Security Note:
 * - Never commit real private keys to version control
 * - Use environment variables for production deployments
 * - The test wallet is only for development purposes
 */

// Target wallet address to receive the minted tokens
const TARGET_WALLET = "your target wallet address";

// Test wallet private key array (64 bytes)
// WARNING: This is a test wallet for development - don't use for production
const TEST_WALLET_PRIVATE_KEY = [
  65, 191, 232, 77, 177, 238, 120, 29, 48, 140, 116, 52, 172, 232, 245, 210,
  155, 142, 58, 16, 32, 13, 174, 185, 225, 115, 55, 237, 30, 84, 131, 61, 45,
  131, 140, 83, 101, 243, 88, 213, 190, 29, 185, 249, 55, 77, 51, 108, 29, 151,
  33, 71, 77, 65, 199, 57, 14, 123, 172, 136, 168, 12, 153, 15,
];

/**
 * Main function to execute the token minting process
 */
async function main() {
  console.log("🪙 Starting token minting process for target wallet...\n");

  // Get private key from available sources
  const walletPrivateKey = TEST_WALLET_PRIVATE_KEY;

  // Initialize Solana connection to devnet
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  // Create keypair from private key array
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletPrivateKey));

  // Initialize Anchor provider with the wallet
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  // Display wallet information
  console.log("🔑 Wallet address:", wallet.publicKey.toBase58());
  console.log("🎯 Target wallet address:", TARGET_WALLET);

  // Check wallet balance for transaction fees
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(
    "💰 Current balance:",
    balance / anchor.web3.LAMPORTS_PER_SOL,
    "SOL"
  );

  // Load deployment configuration
  let deploymentInfo;
  deploymentInfo = JSON.parse(
    fs.readFileSync("./scripts/deployment-info.json", "utf8")
  );

  // Extract token mint addresses from deployment info
  const stakingMint = new PublicKey(deploymentInfo.stakingMint);
  const rewardMint = new PublicKey(deploymentInfo.rewardMint);
  const targetWallet = new PublicKey(TARGET_WALLET);

  // Display token configuration
  console.log("\n📊 Token Configuration:");
  console.log("   Staking Mint:", stakingMint.toBase58());
  console.log("   Reward Mint:", rewardMint.toBase58());

  try {
    // Step 1: Mint staking tokens to target wallet
    console.log("\n🪙 Creating staking token account and minting tokens...");

    // Create or get associated token account for staking tokens
    const stakingTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet, // payer for account creation
      stakingMint,
      targetWallet
    );

    // Mint staking tokens to the target wallet
    await mintTo(
      connection,
      wallet, // payer for transaction
      stakingMint,
      stakingTokenAccount.address,
      wallet.publicKey, // mint authority
      BigInt(1000 * 10 ** 9) // 1000 staking tokens (with 9 decimals)
    );

    console.log("✅ Successfully minted 1000 Staking tokens");
    console.log(
      "📍 Staking token account:",
      stakingTokenAccount.address.toBase58()
    );

    // Step 2: Mint reward tokens to target wallet
    console.log("\n🏆 Creating reward token account and minting tokens...");

    // Create or get associated token account for reward tokens
    const rewardTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet, // payer for account creation
      rewardMint,
      targetWallet
    );

    // Mint reward tokens to the target wallet
    await mintTo(
      connection,
      wallet, // payer for transaction
      rewardMint,
      rewardTokenAccount.address,
      wallet.publicKey, // mint authority
      BigInt(100 * 10 ** 9) // 100 reward tokens (with 9 decimals)
    );

    console.log("✅ Successfully minted 100 Reward tokens");
    console.log(
      "📍 Reward token account:",
      rewardTokenAccount.address.toBase58()
    );

    // Display summary of all operations
    console.log("\n🎉 Token minting completed successfully!");
    console.log("\n📋 Token Account Summary:");
    console.log("═══════════════════════════════════════");
    console.log(`Target Wallet: ${TARGET_WALLET}`);
    console.log(
      `Staking Token Account: ${stakingTokenAccount.address.toBase58()}`
    );
    console.log(`Staking Token Balance: 1000 tokens`);
    console.log(
      `Reward Token Account: ${rewardTokenAccount.address.toBase58()}`
    );
    console.log(`Reward Token Balance: 100 tokens`);
    console.log("═══════════════════════════════════════");
  } catch (error) {
    console.error("❌ Token minting failed:", error);
    throw error;
  }
}

// Execute the main function and handle results
main()
  .then(() => {
    console.log("\n🎉 Script execution completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script execution failed:", error);
    process.exit(1);
  });
