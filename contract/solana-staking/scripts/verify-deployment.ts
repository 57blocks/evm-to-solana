import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
  getAccount,
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";
import BN from "bn.js";

// Import IDL types
import type { SolanaStaking } from "../target/types/solana_staking";

// Program ID
const PROGRAM_ID = new PublicKey("8y11v8SN4VfbasLdPAHBrnVXRQsuCXgFUBWyyC2Hd9LD");
const SYSVAR_CLOCK_PUBKEY = new PublicKey(
  "SysvarC1ock11111111111111111111111111111111"
);

// Parse command line arguments
const args = process.argv.slice(2);
const createNewTokens = args.includes("--new-tokens");
const verbose = args.includes("--verbose");

// Parse staking token if provided
let providedStakingToken: PublicKey | null = null;
const tokenIndex = args.indexOf("--staking-token");
if (tokenIndex !== -1 && args[tokenIndex + 1]) {
  try {
    providedStakingToken = new PublicKey(args[tokenIndex + 1]);
  } catch (e) {
    console.error("❌ Invalid staking token address provided");
    process.exit(1);
  }
}

function log(message: string, ...args: any[]) {
  console.log(message, ...args);
}

function debug(message: string, ...args: any[]) {
  if (verbose) {
    console.log("[DEBUG]", message, ...args);
  }
}

async function main() {
  log("🚀 Starting Solana Staking contract deployment verification...\n");
  
  if (createNewTokens) {
    log("📝 Mode: Create new tokens");
  } else if (providedStakingToken) {
    log("📝 Mode: Use specified staking token:", providedStakingToken.toString());
  } else {
    log("📝 Mode: Reuse existing tokens (if available)");
  }
  log("\n📚 Available options:");
  log("   --new-tokens       Force creation of new tokens");
  log("   --staking-token    Use specific staking token address");
  log("   --verbose          Enable detailed logging");
  log("\n💡 Run 'npm run list' to see all available deployments\n");

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

  const wallet = provider.wallet as anchor.Wallet;
  log("📍 Wallet address:", wallet.publicKey.toString());
  log("📍 Program ID:", PROGRAM_ID.toString());
  log("📍 Network:", provider.connection.rpcEndpoint);

  try {
    let stakingMint: PublicKey;
    let rewardMint: PublicKey;
    let statePda: PublicKey;
    let isNewDeployment = false;

    // Check if contract is already initialized
    log("\n🔍 Checking for existing deployment...");
    
    // Get all GlobalState accounts
    const globalStates = await program.account.globalState.all();
    
    // If specific token provided, find that deployment
    if (providedStakingToken && !createNewTokens) {
      const matchingState = globalStates.find(
        state => state.account.stakingMint.equals(providedStakingToken)
      );
      
      if (matchingState) {
        statePda = matchingState.publicKey;
        const stateAccount = matchingState.account;
        
        stakingMint = stateAccount.stakingMint;
        rewardMint = stateAccount.rewardMint;
        
        log("✅ Found deployment with specified staking token:");
        log("  - State PDA:", statePda.toString());
        log("  - Staking Mint:", stakingMint.toString());
        log("  - Reward Mint:", rewardMint.toString());
        log("  - Total Staked:", stateAccount.totalStaked.toString());
        log("  - Reward Rate:", stateAccount.rewardRate.toString());
      } else {
        log("❌ No deployment found with staking token:", providedStakingToken.toString());
        log("\nAvailable deployments:");
        for (const state of globalStates) {
          log("  -", state.account.stakingMint.toString());
        }
        process.exit(1);
      }
    } else if (globalStates.length > 0 && !createNewTokens) {
      // Use existing deployment
      const existingState = globalStates[0];
      statePda = existingState.publicKey;
      const stateAccount = existingState.account;
      
      stakingMint = stateAccount.stakingMint;
      rewardMint = stateAccount.rewardMint;
      
      log("✅ Found existing deployment:");
      log("  - State PDA:", statePda.toString());
      log("  - Staking Mint:", stakingMint.toString());
      log("  - Reward Mint:", rewardMint.toString());
      log("  - Total Staked:", stateAccount.totalStaked.toString());
      log("  - Reward Rate:", stateAccount.rewardRate.toString());
      
    } else {
      // Create new tokens and initialize
      isNewDeployment = true;
      log("\n1️⃣ Creating new test tokens...");
      
      // Create staking token
      stakingMint = await createMint(
        provider.connection,
        wallet.payer,
        wallet.publicKey,
        null,
        9
      );
      log("✅ Staking Token:", stakingMint.toString());

      // Create reward token
      rewardMint = await createMint(
        provider.connection,
        wallet.payer,
        wallet.publicKey,
        null,
        9
      );
      log("✅ Reward Token:", rewardMint.toString());

      // Calculate PDAs
      [statePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("state"), stakingMint.toBuffer()],
        program.programId
      );

      const [stakingVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("staking_vault"), statePda.toBuffer()],
        program.programId
      );

      const [rewardVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("reward_vault"), statePda.toBuffer()],
        program.programId
      );

      // Initialize contract
      log("\n2️⃣ Initializing contract...");
      
      try {
        const tx = await program.methods
          .initialize(new BN(100)) // 1% per day
          .accountsPartial({
            admin: wallet.publicKey,
            state: statePda,
            stakingMint,
            rewardMint,
            stakingVault: stakingVaultPda,
            rewardVault: rewardVaultPda,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            clock: SYSVAR_CLOCK_PUBKEY,
          })
          .rpc();

        log("✅ Initialize successful! Transaction:", tx);
      } catch (error: any) {
        console.error("Failed to initialize:", error);
        throw error;
      }
    }

    // Get vault PDAs
    const [stakingVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("staking_vault"), statePda.toBuffer()],
      program.programId
    );

    const [rewardVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_vault"), statePda.toBuffer()],
      program.programId
    );

    // Prepare test accounts
    log("\n3️⃣ Preparing test accounts...");
    
    // Get or create user token accounts
    let userStakingAccount: PublicKey;
    let userRewardAccount: PublicKey;
    
    try {
      const associatedStakingAddress = await getAssociatedTokenAddress(
        stakingMint,
        wallet.publicKey
      );
      
      // Check if account exists
      const accountInfo = await provider.connection.getAccountInfo(associatedStakingAddress);
      
      if (accountInfo) {
        userStakingAccount = associatedStakingAddress;
        debug("Using existing staking token account");
      } else {
        userStakingAccount = await createAssociatedTokenAccount(
          provider.connection,
          wallet.payer,
          stakingMint,
          wallet.publicKey
        );
        debug("Created new staking token account");
      }
    } catch (e) {
      debug("Error handling staking account:", e);
      throw e;
    }
    
    try {
      const associatedRewardAddress = await getAssociatedTokenAddress(
        rewardMint,
        wallet.publicKey
      );
      
      // Check if account exists
      const accountInfo = await provider.connection.getAccountInfo(associatedRewardAddress);
      
      if (accountInfo) {
        userRewardAccount = associatedRewardAddress;
        debug("Using existing reward token account");
      } else {
        userRewardAccount = await createAssociatedTokenAccount(
          provider.connection,
          wallet.payer,
          rewardMint,
          wallet.publicKey
        );
        debug("Created new reward token account");
      }
    } catch (e) {
      debug("Error handling reward account:", e);
      throw e;
    }

    // Check balances and mint if needed
    const stakingAccountInfo = await getAccount(provider.connection, userStakingAccount);
    const currentStakingBalance = Number(stakingAccountInfo.amount) / (10 ** 9);
    
    log(`📊 Current staking token balance: ${currentStakingBalance}`);
    
    if (currentStakingBalance < 100) {
      const mintAmount = 1000 * 10 ** 9;
      await mintTo(
        provider.connection,
        wallet.payer,
        stakingMint,
        userStakingAccount,
        wallet.payer,
        mintAmount
      );
      log("✅ Minted 1000 staking tokens to user");
    }

    // Check reward vault balance and mint if needed
    const rewardVaultAccountInfo = await getAccount(provider.connection, rewardVaultPda);
    const currentRewardVaultBalance = Number(rewardVaultAccountInfo.amount) / (10 ** 9);
    
    log(`📊 Current reward vault balance: ${currentRewardVaultBalance}`);
    
    if (currentRewardVaultBalance < 1000) {
      const mintAmount = 10000 * 10 ** 9;
      await mintTo(
        provider.connection,
        wallet.payer,
        rewardMint,
        rewardVaultPda,
        wallet.payer,
        mintAmount
      );
      log("✅ Minted 10000 reward tokens to vault");
    }

    // Test stake
    log("\n4️⃣ Testing stake method...");
    
    const [userStakeInfoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake"), statePda.toBuffer(), wallet.publicKey.toBuffer()],
      program.programId
    );

    const [blacklistPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), statePda.toBuffer(), wallet.publicKey.toBuffer()],
      program.programId
    );

    // Check current stake
    let currentStake = 0;
    try {
      const stakeInfo = await program.account.userStakeInfo.fetch(userStakeInfoPda);
      currentStake = Number(stakeInfo.amount) / (10 ** 9);
      log(`📊 Current stake: ${currentStake} tokens`);
    } catch (e) {
      log("📊 No existing stake found");
    }

    const stakeAmount = new BN(100 * 10 ** 9); // 100 tokens
    
    try {
      const tx = await program.methods
        .stake(stakeAmount)
        .accountsPartial({
          user: wallet.publicKey,
          state: statePda,
          userStakeInfo: userStakeInfoPda,
          userTokenAccount: userStakingAccount,
          stakingVault: stakingVaultPda,
          rewardVault: rewardVaultPda,
          userRewardAccount,
          blacklistEntry: blacklistPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      log("✅ Stake successful! Transaction:", tx);
      
      // Verify stake info
      const stakeInfo = await program.account.userStakeInfo.fetch(userStakeInfoPda);
      log("📊 Updated stake info:");
      log("  - Amount:", Number(stakeInfo.amount) / (10 ** 9), "tokens");
      log("  - Owner:", stakeInfo.owner.toString());
    } catch (error) {
      console.error("❌ Stake failed:", error);
    }

    // Wait and test claim rewards
    log("\n5️⃣ Waiting 5 seconds before testing claim_rewards...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      const beforeBalance = await getAccount(provider.connection, userRewardAccount);
      const beforeAmount = Number(beforeBalance.amount) / (10 ** 9);
      
      const tx = await program.methods
        .claimRewards()
        .accountsPartial({
          user: wallet.publicKey,
          state: statePda,
          userStakeInfo: userStakeInfoPda,
          userRewardAccount,
          rewardVault: rewardVaultPda,
          blacklistEntry: blacklistPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      log("✅ Claim rewards successful! Transaction:", tx);
      
      // Check reward balance
      const afterBalance = await getAccount(provider.connection, userRewardAccount);
      const afterAmount = Number(afterBalance.amount) / (10 ** 9);
      const rewardsEarned = afterAmount - beforeAmount;
      
      log(`🎁 Rewards earned: ${rewardsEarned.toFixed(6)} tokens`);
    } catch (error) {
      console.error("❌ Claim rewards failed:", error);
    }

    // Test partial unstake
    log("\n6️⃣ Testing unstake method (partial)...");
    
    const unstakeAmount = new BN(50 * 10 ** 9); // 50 tokens
    
    try {
      const tx = await program.methods
        .unstake(unstakeAmount)
        .accountsPartial({
          user: wallet.publicKey,
          state: statePda,
          userStakeInfo: userStakeInfoPda,
          userTokenAccount: userStakingAccount,
          stakingVault: stakingVaultPda,
          rewardVault: rewardVaultPda,
          userRewardAccount,
          blacklistEntry: blacklistPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      log("✅ Unstake successful! Transaction:", tx);
      
      // Verify remaining stake
      const stakeInfo = await program.account.userStakeInfo.fetch(userStakeInfoPda);
      log("📊 Remaining stake:", Number(stakeInfo.amount) / (10 ** 9), "tokens");
    } catch (error) {
      console.error("❌ Unstake failed:", error);
    }

    // Test blacklist functionality (only if new deployment)
    if (isNewDeployment) {
      log("\n7️⃣ Testing blacklist functionality...");
      
      // Create a test address
      const testUser = Keypair.generate();
      const [testBlacklistPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("blacklist"), statePda.toBuffer(), testUser.publicKey.toBuffer()],
        program.programId
      );

      try {
        // Add to blacklist
        const tx = await program.methods
          .addToBlacklist(testUser.publicKey)
          .accountsPartial({
            admin: wallet.publicKey,
            state: statePda,
            blacklistEntry: testBlacklistPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        log("✅ Add to blacklist successful! Transaction:", tx);
        
        // Verify blacklist
        const blacklistEntry = await program.account.blacklistEntry.fetch(testBlacklistPda);
        log("🚫 Blacklisted address:", blacklistEntry.address.toString());

        // Remove from blacklist
        const removeTx = await program.methods
          .removeFromBlacklist(testUser.publicKey)
          .accountsPartial({
            admin: wallet.publicKey,
            state: statePda,
            blacklistEntry: testBlacklistPda,
          })
          .rpc();

        log("✅ Remove from blacklist successful! Transaction:", removeTx);
      } catch (error) {
        console.error("❌ Blacklist operation failed:", error);
      }
    } else {
      log("\n7️⃣ Skipping blacklist test (using existing deployment)");
    }

    // Final summary
    log("\n📊 Final Summary:");
    
    const finalState = await program.account.globalState.fetch(statePda);
    log("  - Total Staked:", Number(finalState.totalStaked) / (10 ** 9), "tokens");
    
    try {
      const userStakeInfo = await program.account.userStakeInfo.fetch(userStakeInfoPda);
      log("  - Your Stake:", Number(userStakeInfo.amount) / (10 ** 9), "tokens");
    } catch (e) {
      log("  - Your Stake: 0 tokens");
    }
    
    const stakingBalance = await getAccount(provider.connection, userStakingAccount);
    log("  - Your Staking Token Balance:", Number(stakingBalance.amount) / (10 ** 9), "tokens");
    
    const rewardBalance = await getAccount(provider.connection, userRewardAccount);
    log("  - Your Reward Token Balance:", Number(rewardBalance.amount) / (10 ** 9), "tokens");

    log("\n✨ Verification complete! All methods have been tested.");
    
  } catch (error) {
    console.error("\n❌ Error during verification:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    log("\n👋 Verification script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script execution failed:", error);
    process.exit(1);
  });