import { createWalletClient, createPublicClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// Contract address
const STAKING_TOKEN_ADDRESS = "0xADC6ab58C08C0649326F1185a661C41Bdd112447";

// Deployer account (owner of the contracts)
const DEPLOYER_PRIVATE_KEY = "0x3a890247503953c9b4ecbe5ec7ce5ec7f9927a378f90da0b75702faa78650c5c";

// ============================================
// UPDATE THIS ADDRESS TO MINT TOKENS TO
// ============================================
const TARGET_WALLET = "0xD5c34B91a2B9ea935d2a7a8eb538a6Ee99B81dd3";

// Amount to mint (in tokens, will be converted to wei)
const MINT_AMOUNT = 10n; // 1000 tokens

// Minimal ABI for minting
const tokenAbi = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

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
      abi: tokenAbi,
      functionName: "name",
    });

    const stakingTokenSymbol = await publicClient.readContract({
      address: STAKING_TOKEN_ADDRESS,
      abi: tokenAbi,
      functionName: "symbol",
    });

    console.log(`Token: ${stakingTokenName} (${stakingTokenSymbol})`);

    // Check balance before
    const balanceBefore = await publicClient.readContract({
      address: STAKING_TOKEN_ADDRESS,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [TARGET_WALLET as `0x${string}`],
    });
    console.log(`Balance before: ${formatEther(balanceBefore)} ${stakingTokenSymbol}`);

    // Mint tokens
    const hash = await walletClient.writeContract({
      address: STAKING_TOKEN_ADDRESS,
      abi: tokenAbi,
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
      abi: tokenAbi,
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
