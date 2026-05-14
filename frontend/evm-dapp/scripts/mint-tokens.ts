import { createWalletClient, createPublicClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { stakingTokenAbi } from "../abi/StakingTokenABI";
import { STAKING_TOKEN_ADDRESS } from "../consts";
// Deployer account (owner of the contracts)
const DEPLOYER_PRIVATE_KEY = "0x9250a87e7f1f53d91e0f7c414cec275db49081a3f2283c4ce46b395921f5fa2d";
// ============================================
// UPDATE THIS ADDRESS TO MINT TOKENS TO
// ============================================
const TARGET_WALLET = "0xD5c34B91a2B9ea935d2a7a8eb538a6Ee99B81dd3";

// Amount to mint (in tokens, will be converted to wei)
const MINT_AMOUNT = 10n; // 1000 tokens

async function main() {
  console.log("=".repeat(50));
  console.log("EVM Token Minting Script");
  console.log("=".repeat(50));

  // Setup account from private key
  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY as `0x${string}`);
  console.log(`\nDeployer address: ${account.address}`);
  console.log(`Target wallet: ${TARGET_WALLET}`);
  console.log(`Amount to mint: ${MINT_AMOUNT} tokens`);

  // Create clients
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(),
  });

  // Convert to wei (18 decimals)
  const amountWei = MINT_AMOUNT * 10n ** 18n;

  // Mint Staking Token
  console.log("\n" + "-".repeat(50));
  console.log("Minting Staking Token...");

  try {
    const stakingTokenName = await publicClient.readContract({
      address: STAKING_TOKEN_ADDRESS,
      abi: stakingTokenAbi,
      functionName: "name",
    });

    const stakingTokenSymbol = await publicClient.readContract({
      address: STAKING_TOKEN_ADDRESS,
      abi: stakingTokenAbi,
      functionName: "symbol",
    });

    console.log(`Token: ${stakingTokenName} (${stakingTokenSymbol})`);

    // Check balance before
    const balanceBefore = await publicClient.readContract({
      address: STAKING_TOKEN_ADDRESS,
      abi: stakingTokenAbi,
      functionName: "balanceOf",
      args: [TARGET_WALLET as `0x${string}`],
    });
    console.log(`Balance before: ${formatEther(balanceBefore)} ${stakingTokenSymbol}`);

    // Mint tokens
    const hash = await walletClient.writeContract({
      address: STAKING_TOKEN_ADDRESS,
      abi: stakingTokenAbi,
      functionName: "mint",
      args: [TARGET_WALLET as `0x${string}`, amountWei],
    });

    console.log(`Transaction hash: ${hash}`);
    console.log("Waiting for confirmation...");

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    // Check balance after
    const balanceAfter = await publicClient.readContract({
      address: STAKING_TOKEN_ADDRESS,
      abi: stakingTokenAbi,
      functionName: "balanceOf",
      args: [TARGET_WALLET as `0x${string}`],
    });
    console.log(`Balance after: ${formatEther(balanceAfter)} ${stakingTokenSymbol}`);
  } catch (error) {
    console.error("Failed to mint staking token:", error);
  }

  console.log("\n" + "=".repeat(50));
  console.log("Minting complete!");
  console.log("=".repeat(50));
}

main().catch(console.error);
