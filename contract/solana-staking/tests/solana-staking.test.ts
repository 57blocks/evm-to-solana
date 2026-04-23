import { expect } from "chai";
import { LiteSVM, Clock } from "litesvm";
import { LiteSVMProvider } from "anchor-litesvm";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import { type KeyPairSigner, address } from "@solana/kit";
import * as programClient from "../dist/js-client";
import {
  createTestUser,
  setupUserWithTokens,
  sendTransaction,
  getGlobalState,
  getUserStakeInfo,
  getUserStakePda,
  getBlacklistPda,
  createMint,
  mintTo,
  getAccount,
  programId,
  toToken,
  getBlacklistEntry,
} from "./helper";

const SECONDS_IN_A_DAY = 86400;
const REWARD_PER_SECOND = toToken(1) / BigInt(1000); // 0.001 token/sec

describe("solana-staking", () => {
  let svm: LiteSVM;
  let provider: LiteSVMProvider;
  let admin: Keypair;
  let adminSigner: KeyPairSigner;
  let stakingMint: PublicKey;
  let rewardMint: PublicKey;

  // PDAs
  let poolId: PublicKey;
  let statePda: PublicKey;
  let poolStatePda: PublicKey;
  let stakingTokenPda: PublicKey;
  let rewardVaultPda: PublicKey;

  // Helper functions that can access outer scope variables
  async function stakeTokens(
    user: Keypair,
    userSigner: any,
    stakingToken: PublicKey,
    rewardToken: PublicKey,
    amount: bigint
  ) {
    const userStakePda = getUserStakePda(statePda, user.publicKey);
    // Always use the user's blacklist PDA, whether it exists or not
    const userBlacklistPda = getBlacklistPda(statePda, user.publicKey);
    const stakeInstruction = programClient.getStakeInstruction({
      user: userSigner,
      poolConfig: address(statePda.toBase58()),
      poolState: address(poolStatePda.toBase58()),
      userStakeInfo: address(userStakePda.toBase58()),
      userTokenAccount: address(stakingToken.toBase58()),
      stakingToken: address(stakingTokenPda.toBase58()),
      tokenProgram: address(TOKEN_PROGRAM_ID.toBase58()),
      blacklistEntry: address(userBlacklistPda.toBase58()),
      amount: amount,
    });
    return await sendTransaction(provider, stakeInstruction, user);
  }

  async function unstakeTokens(
    user: Keypair,
    userSigner: any,
    stakingToken: PublicKey,
    amount: bigint
  ) {
    const userStakePda = getUserStakePda(statePda, user.publicKey);
    const unstakeInstruction = programClient.getUnstakeInstruction({
      user: userSigner,
      poolConfig: address(statePda.toBase58()),
      poolState: address(poolStatePda.toBase58()),
      userStakeInfo: address(userStakePda.toBase58()),
      userTokenAccount: address(stakingToken.toBase58()),
      stakingToken: address(stakingTokenPda.toBase58()),
      tokenProgram: address(TOKEN_PROGRAM_ID.toBase58()),
      amount: amount,
    });
    return await sendTransaction(provider, unstakeInstruction, user);
  }

  async function claimUserRewards(
    user: Keypair,
    userSigner: any,
    rewardToken: PublicKey
  ) {
    const userStakePda = getUserStakePda(statePda, user.publicKey);
    const claimInstruction = programClient.getClaimRewardsInstruction({
      user: userSigner,
      poolConfig: address(statePda.toBase58()),
      poolState: address(poolStatePda.toBase58()),
      userStakeInfo: address(userStakePda.toBase58()),
      userRewardAccount: address(rewardToken.toBase58()),
      rewardVault: address(rewardVaultPda.toBase58()),
      tokenProgram: address(TOKEN_PROGRAM_ID.toBase58()),
    });
    return await sendTransaction(provider, claimInstruction, user);
  }

  async function closeUserStakeAccount(user: Keypair, userSigner: any) {
    const userStakePda = getUserStakePda(statePda, user.publicKey);
    const closeInstruction = programClient.getCloseUserStakeAccountInstruction({
      user: userSigner,
      poolConfig: address(statePda.toBase58()),
      userStakeInfo: address(userStakePda.toBase58()),
    });
    return await sendTransaction(provider, closeInstruction, user);
  }

  async function withdrawRemainingRewards(amount: bigint) {
    const { rewardToken: adminRewardAccount } = await setupUserWithTokens(
      provider,
      admin,
      admin,
      stakingMint,
      rewardMint,
      BigInt(0)
    );
    const withdrawInstruction =
      programClient.getWithdrawRemainingRewardsInstruction({
        admin: adminSigner,
        poolConfig: address(statePda.toBase58()),
        poolState: address(poolStatePda.toBase58()),
        adminRewardAccount: address(adminRewardAccount.toBase58()),
        rewardVault: address(rewardVaultPda.toBase58()),
        tokenProgram: address(TOKEN_PROGRAM_ID.toBase58()),
        amount,
      });
    return await sendTransaction(provider, withdrawInstruction, admin);
  }

  async function closePool() {
    const closePoolInstruction = programClient.getClosePoolInstruction({
      admin: adminSigner,
      poolConfig: address(statePda.toBase58()),
      poolState: address(poolStatePda.toBase58()),
      stakingToken: address(stakingTokenPda.toBase58()),
      rewardVault: address(rewardVaultPda.toBase58()),
      tokenProgram: address(TOKEN_PROGRAM_ID.toBase58()),
    });
    return await sendTransaction(provider, closePoolInstruction, admin);
  }

  async function addUserToBlacklist(userToBlacklist: PublicKey) {
    const blacklistPda = getBlacklistPda(statePda, userToBlacklist);
    const addToBlacklistInstruction =
      programClient.getAddToBlacklistInstruction({
        admin: adminSigner,
        systemProgram: address(SystemProgram.programId.toBase58()),
        poolConfig: address(statePda.toBase58()),
        blacklistEntry: address(blacklistPda.toBase58()),
        address: address(userToBlacklist.toBase58()),
      });
    return await sendTransaction(provider, addToBlacklistInstruction, admin);
  }

  async function removeUserFromBlacklist(userToRemove: PublicKey) {
    const blacklistPda = getBlacklistPda(statePda, userToRemove);
    const removeFromBlacklistInstruction =
      programClient.getRemoveFromBlacklistInstruction({
        admin: adminSigner,
        poolConfig: address(statePda.toBase58()),
        blacklistEntry: address(blacklistPda.toBase58()),
        address: address(userToRemove.toBase58()),
      });
    return await sendTransaction(
      provider,
      removeFromBlacklistInstruction,
      admin
    );
  }

  function setNextBlockTimestamp(timestamp: number): void {
    const clock = provider.client.getClock();
    provider.client.setClock(
      new Clock(
        clock.slot,
        clock.epochStartTimestamp,
        clock.epoch,
        clock.leaderScheduleEpoch,
        BigInt(timestamp)
      )
    );
  }

  function expectClosedOrDrainedAccount(account: any) {
    if (!account) {
      return;
    }
    expect(account.lamports).to.equal(0);
    expect(account.owner.toBase58()).to.equal(
      SystemProgram.programId.toBase58()
    );
    expect(account.data.length).to.equal(0);
  }

  async function createNewPoolAccounts() {
    stakingMint = createMint(provider, admin, admin.publicKey, null, 9);
    rewardMint = createMint(provider, admin, admin.publicKey, null, 9);

    // Generate a unique pool ID for each pool
    poolId = Keypair.generate().publicKey;

    [statePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_config"), poolId.toBuffer()],
      programId
    );

    [poolStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_state"), statePda.toBuffer()],
      programId
    );

    [stakingTokenPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("staking_token"), statePda.toBuffer()],
      programId
    );

    [rewardVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_vault"), statePda.toBuffer()],
      programId
    );
  }

  async function createPool() {
    const createPoolInstruction = programClient.getCreatePoolInstruction({
      admin: adminSigner,
      poolConfig: address(statePda.toBase58()),
      poolState: address(poolStatePda.toBase58()),
      stakingMint: address(stakingMint.toBase58()),
      rewardMint: address(rewardMint.toBase58()),
      stakingToken: address(stakingTokenPda.toBase58()),
      rewardVault: address(rewardVaultPda.toBase58()),
      tokenProgram: address(TOKEN_PROGRAM_ID.toBase58()),
      poolId: address(poolId.toBase58()),
      rewardPerSecond: REWARD_PER_SECOND,
    });
    await sendTransaction(provider, createPoolInstruction, admin);

    mintTo(
      provider,
      admin, // payer
      rewardMint,
      rewardVaultPda,
      admin, // mint authority
      toToken(5000) // 5000 tokens for rewards
    );
  }

  async function setupNewPool() {
    await createNewPoolAccounts();
    await createPool();
  }

  before(async () => {
    // Initialize LiteSVM with transaction history disabled
    svm = new LiteSVM().withTransactionHistory(0n);

    const adminData = await createTestUser(svm, 100);
    admin = adminData.user;
    adminSigner = adminData.userSigner;

    // Initialize provider after airdrop
    provider = new LiteSVMProvider(svm);
    // Set the default payer for transactions
    (provider.wallet as any).payer = admin;

    // Set clock to current time
    setNextBlockTimestamp(Math.floor(Date.now() / 1000));

    // Load and deploy the staking program
    const programBinary = fs.readFileSync("./target/deploy/solana_staking.so");
    svm.addProgram(programId, programBinary);
    console.log("Staking program deployed to LiteSVM");

    await createNewPoolAccounts();
  });

  describe("CreatePool", () => {
    beforeEach(async () => {
      await createNewPoolAccounts();
    });

    it("should fail with invalid reward per second", async () => {
      // Test with reward per second = 0
      try {
        const createPoolInstruction = programClient.getCreatePoolInstruction({
          admin: adminSigner,
          poolConfig: address(statePda.toBase58()),
          poolState: address(poolStatePda.toBase58()),
          stakingMint: address(stakingMint.toBase58()),
          rewardMint: address(rewardMint.toBase58()),
          stakingToken: address(stakingTokenPda.toBase58()),
          rewardVault: address(rewardVaultPda.toBase58()),
          tokenProgram: address(TOKEN_PROGRAM_ID.toBase58()),
          poolId: address(poolId.toBase58()),
          rewardPerSecond: 0, // Invalid: = 0
        });

        await sendTransaction(provider, createPoolInstruction, admin);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.toString()).to.include("InvalidRewardPerSecond");
      }
    });

    it("should create the staking pool", async () => {
      // Create pool instruction
      const createPoolInstruction = programClient.getCreatePoolInstruction({
        admin: adminSigner,
        poolConfig: address(statePda.toBase58()),
        poolState: address(poolStatePda.toBase58()),
        stakingMint: address(stakingMint.toBase58()),
        rewardMint: address(rewardMint.toBase58()),
        stakingToken: address(stakingTokenPda.toBase58()),
        rewardVault: address(rewardVaultPda.toBase58()),
        tokenProgram: address(TOKEN_PROGRAM_ID.toBase58()),
        poolId: address(poolId.toBase58()),
        rewardPerSecond: REWARD_PER_SECOND,
      });

      // Create and send transaction
      const txHash = await sendTransaction(
        provider,
        createPoolInstruction,
        admin
      );
      console.log("CreatePool transaction:", txHash);

      // Verify initialization
      const stateAccount = provider.client.getAccount(statePda);
      expect(stateAccount).to.not.be.null;

      // Verify vaults are created
      const stakingTokenAccount = provider.client.getAccount(stakingTokenPda);
      const rewardVaultAccount = provider.client.getAccount(rewardVaultPda);
      expect(stakingTokenAccount).to.not.be.null;
      expect(rewardVaultAccount).to.not.be.null;

      // Verify global state data
      const globalState = getGlobalState(provider, statePda);
      expect(globalState).to.not.be.null;
      expect(globalState!.admin.toString()).to.equal(
        admin.publicKey.toBase58()
      );
      expect(globalState!.poolId.toString()).to.equal(poolId.toBase58());
      expect(globalState!.stakingMint.toString()).to.equal(
        stakingMint.toBase58()
      );
      expect(globalState!.rewardMint.toString()).to.equal(
        rewardMint.toBase58()
      );
      expect(globalState!.rewardPerSecond.toString()).to.equal(
        REWARD_PER_SECOND.toString()
      );
      expect(globalState!.accRewardPerShare.toString()).to.equal("0");
      expect(Number(globalState!.lastRewardTime.toString())).to.be.above(0);
      expect(globalState!.totalStaked.toString()).to.equal("0");

      mintTo(
        provider,
        admin, // payer
        rewardMint,
        rewardVaultPda,
        admin, // mint authority
        toToken(5000) // 5000 tokens for rewards
      );
      const rewardVaultBalance = getAccount(provider, rewardVaultPda);
      expect(Number(rewardVaultBalance.amount)).to.equal(Number(toToken(5000)));
    });
  });

  describe("Stake", () => {
    beforeEach(async () => {
      await setupNewPool();
    });

    it("should allow user to stake tokens", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );
      const stakeAmount = toToken(100);
      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        stakeAmount
      );

      // Verify stake
      const stakingTokenAccount = getAccount(provider, stakingTokenPda);
      expect(Number(stakingTokenAccount.amount)).to.equal(Number(stakeAmount));

      // Verify user stake info data
      const userStakePda = getUserStakePda(statePda, user.publicKey);
      const userStakeInfo = getUserStakeInfo(provider, userStakePda);
      expect(userStakeInfo).to.not.be.null;
      expect(userStakeInfo!.amount.toString()).to.equal(stakeAmount.toString());
      expect(userStakeInfo!.rewardDebt.toString()).to.equal("0");

      // Verify global state total staked was updated
      const globalState = getGlobalState(provider, statePda);
      expect(globalState!.totalStaked.toString()).to.equal(
        stakeAmount.toString()
      );
    });

    it("should fail when staking zero tokens", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );

      try {
        await stakeTokens(
          user,
          userSigner,
          stakingToken,
          rewardToken,
          BigInt(0) // Try to stake 0 tokens
        );
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.toString()).to.include("Cannot stake 0 tokens");
      }
    });

    it("should allow multiple stakes to accumulate", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );

      // First stake
      const firstStakeAmount = toToken(50);
      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        firstStakeAmount
      );

      // Verify first stake
      const userStakePda = getUserStakePda(statePda, user.publicKey);
      let userStakeInfo = getUserStakeInfo(provider, userStakePda);
      expect(userStakeInfo!.amount.toString()).to.equal(
        firstStakeAmount.toString()
      );

      // Second stake
      const secondStakeAmount = toToken(30);
      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        secondStakeAmount
      );

      // Verify accumulated stake
      userStakeInfo = getUserStakeInfo(provider, userStakePda);
      let totalExpected = firstStakeAmount + secondStakeAmount;
      expect(userStakeInfo!.amount.toString()).to.equal(
        totalExpected.toString()
      );

      // Third stake
      const thirdStakeAmount = toToken(20);
      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        thirdStakeAmount
      );

      // Verify final accumulated stake
      userStakeInfo = getUserStakeInfo(provider, userStakePda);
      totalExpected += thirdStakeAmount;
      expect(userStakeInfo!.amount.toString()).to.equal(
        totalExpected.toString()
      );
    });

    it("should prevent blacklisted user from staking", async () => {
      const { user: blacklistedUser, userSigner: blacklistedUserSigner } =
        await createTestUser(svm);
      const {
        stakingToken: blacklistedUserStakingToken,
        rewardToken: blacklistedUserRewardToken,
      } = await setupUserWithTokens(
        provider,
        admin,
        blacklistedUser,
        stakingMint,
        rewardMint
      );

      // First add to blacklist
      await addUserToBlacklist(blacklistedUser.publicKey);

      // Try to stake - this should fail
      try {
        await stakeTokens(
          blacklistedUser,
          blacklistedUserSigner,
          blacklistedUserStakingToken,
          blacklistedUserRewardToken,
          toToken(100)
        );
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.toString()).to.include("Address is blacklisted");
      }
    });
  });

  describe("Claim Rewards with Time Manipulation", () => {
    beforeEach(async () => {
      await setupNewPool();
    });

    it("should calculate rewards correctly after time advancement", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );

      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        toToken(100)
      );

      // Get initial state
      const userStakePda = getUserStakePda(statePda, user.publicKey);
      const stateAfterStake = getGlobalState(provider, statePda);
      const stakeTime = Number(stateAfterStake!.lastRewardTime.toString());
      console.log("Last reward time:", stakeTime);

      // Get initial reward balance
      const initialRewardAccount = getAccount(provider, rewardToken);
      const initialBalance = BigInt(initialRewardAccount.amount);
      console.log("Initial reward balance:", initialBalance);

      // Advance time by 5 days from stake time
      const fiveDaysLater = stakeTime + 5 * SECONDS_IN_A_DAY;
      setNextBlockTimestamp(fiveDaysLater);
      console.log(
        `Time advanced from ${stakeTime} to ${fiveDaysLater} (5 days)`
      );

      await claimUserRewards(user, userSigner, rewardToken);

      // Check rewards received
      const afterRewardAccount = getAccount(provider, rewardToken);
      const rewardsReceived =
        BigInt(afterRewardAccount.amount) - initialBalance;

      // Single staker: rewards = time * rewardPerSecond
      const expectedRewards = BigInt(5 * SECONDS_IN_A_DAY) * REWARD_PER_SECOND;
      console.log(`Rewards received: ${rewardsReceived}`);
      console.log(`Expected rewards: ${expectedRewards}`);
      expect(rewardsReceived).to.equal(expectedRewards);
    });

    it("should not reset staking duration when claiming", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );

      // Stake tokens
      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        toToken(100)
      );

      // Get initial time from global state
      const userStakePda = getUserStakePda(statePda, user.publicKey);
      const stateAfterStake = getGlobalState(provider, statePda);
      const currentTime = Number(stateAfterStake!.lastRewardTime.toString());
      const twoDaysLater = currentTime + 2 * SECONDS_IN_A_DAY;
      setNextBlockTimestamp(twoDaysLater);

      // Claim rewards
      const rewardBalanceBefore = BigInt(
        getAccount(provider, rewardToken).amount
      );
      await claimUserRewards(user, userSigner, rewardToken);
      const rewardBalanceAfter = BigInt(
        getAccount(provider, rewardToken).amount
      );

      // Verify stake amount hasn't changed
      const afterClaimStakeInfo = getUserStakeInfo(provider, userStakePda);
      expect(afterClaimStakeInfo!.amount.toString()).to.equal(
        toToken(100).toString()
      );
      expect(rewardBalanceAfter - rewardBalanceBefore).to.equal(
        BigInt(2 * SECONDS_IN_A_DAY) * REWARD_PER_SECOND
      );

      // Advance time by another 3 days and claim again
      const fiveDaysFromStart = currentTime + 5 * SECONDS_IN_A_DAY;
      setNextBlockTimestamp(fiveDaysFromStart);
      const rewardBalanceBefore2 = BigInt(
        getAccount(provider, rewardToken).amount
      );
      await claimUserRewards(user, userSigner, rewardToken);
      const rewardBalanceAfter2 = BigInt(
        getAccount(provider, rewardToken).amount
      );

      // Verify amount still hasn't changed and rewards match incremental time
      const finalStakeInfo = getUserStakeInfo(provider, userStakePda);
      expect(finalStakeInfo!.amount.toString()).to.equal(
        toToken(100).toString()
      );
      expect(rewardBalanceAfter2 - rewardBalanceBefore2).to.equal(
        BigInt(3 * SECONDS_IN_A_DAY) * REWARD_PER_SECOND
      );
    });

    it("should calculate rewards accurately for various time periods", async () => {
      // Test reward calculation precision with different time periods
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );
      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        toToken(100)
      );
      const userStakePda = getUserStakePda(statePda, user.publicKey);
      const testCases = [
        { hoursFromStart: 1 },
        { hoursFromStart: 6 },
        { hoursFromStart: 18 },
        { hoursFromStart: 36 },
        { hoursFromStart: 60 },
      ];

      // Store the initial time from global state
      const initialState = getGlobalState(provider, statePda);
      const stakeTimestamp = Number(initialState!.lastRewardTime);
      let totalClaimedRewards = BigInt(0);

      for (const testCase of testCases) {
        // Get current state
        const beforeBalance = getAccount(provider, rewardToken);
        const startBalance = BigInt(beforeBalance.amount);
        console.log("startBalance", startBalance);

        // Check reward vault balance
        const rewardVaultBalance = getAccount(provider, rewardVaultPda);
        console.log("rewardVaultBalance", rewardVaultBalance.amount);

        // Advance time to X hours from initial stake
        const newTime = stakeTimestamp + testCase.hoursFromStart * 3600;
        setNextBlockTimestamp(newTime);
        console.log(
          `\nTesting ${testCase.hoursFromStart} hours from initial stake`
        );

        // Calculate expected rewards for this claim
        const expectedIncrementalRewards =
          BigInt(newTime - stakeTimestamp) * REWARD_PER_SECOND -
          totalClaimedRewards;
        console.log(
          `Expected incremental rewards: ${expectedIncrementalRewards} lamports`
        );

        // Check if reward vault has enough balance
        const rewardVaultBeforeClaim = getAccount(provider, rewardVaultPda);
        console.log(
          `Reward vault before claim: ${rewardVaultBeforeClaim.amount} lamports`
        );
        console.log(
          `Has enough balance: ${BigInt(rewardVaultBeforeClaim.amount) >= expectedIncrementalRewards}`
        );

        // Claim rewards
        await claimUserRewards(user, userSigner, rewardToken);

        // Check rewards
        const afterBalance = getAccount(provider, rewardToken);
        console.log("afterBalance", afterBalance.amount);
        const incrementalRewards = BigInt(afterBalance.amount) - startBalance;
        totalClaimedRewards += incrementalRewards;
        console.log(`Incremental rewards: ${incrementalRewards} lamports`);
        console.log(`Total claimed rewards: ${totalClaimedRewards} lamports`);
        const expectedTotal =
          BigInt(testCase.hoursFromStart * 3600) * REWARD_PER_SECOND;
        console.log(`Expected total: ${expectedTotal} lamports`);
        // Verify total rewards match expected
        expect(totalClaimedRewards).to.equal(expectedTotal);
      }
    });

    it("should allow blacklisted user to claim rewards for safe exit", async () => {
      const { user: blacklistedUser, userSigner: blacklistedUserSigner } =
        await createTestUser(svm);
      const {
        stakingToken: blacklistedUserStakingToken,
        rewardToken: blacklistedUserRewardToken,
      } = await setupUserWithTokens(
        provider,
        admin,
        blacklistedUser,
        stakingMint,
        rewardMint
      );

      // First, stake some tokens before blacklisting
      await stakeTokens(
        blacklistedUser,
        blacklistedUserSigner,
        blacklistedUserStakingToken,
        blacklistedUserRewardToken,
        toToken(50)
      );

      // Add to blacklist
      await addUserToBlacklist(blacklistedUser.publicKey);

      const stateAfterStake = getGlobalState(provider, statePda);
      const nextDay =
        Number(stateAfterStake!.lastRewardTime.toString()) + SECONDS_IN_A_DAY;
      setNextBlockTimestamp(nextDay);

      const rewardBefore = BigInt(
        getAccount(provider, blacklistedUserRewardToken).amount
      );
      await claimUserRewards(
        blacklistedUser,
        blacklistedUserSigner,
        blacklistedUserRewardToken
      );
      const rewardAfter = BigInt(
        getAccount(provider, blacklistedUserRewardToken).amount
      );

      expect(rewardAfter > rewardBefore).to.equal(true);
    });
  });

  describe("Unstake", () => {
    beforeEach(async () => {
      await setupNewPool();
    });

    it("should allow user to unstake tokens", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );

      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        toToken(100)
      );

      const globalStateBefore = getGlobalState(provider, statePda);
      console.log(
        "Global state total staked before:",
        globalStateBefore!.totalStaked
      );

      const unstakeAmount = toToken(40);
      await unstakeTokens(
        user,
        userSigner,
        stakingToken,
        unstakeAmount
      );

      // Verify user stake info data
      const userStakePda = getUserStakePda(statePda, user.publicKey);
      const userStakeInfo = getUserStakeInfo(provider, userStakePda);
      expect(userStakeInfo).to.not.be.null;
      expect(userStakeInfo!.amount.toString()).to.equal(toToken(60).toString());
      expect(userStakeInfo!.rewardDebt.toString()).to.equal("0");

      // Verify global state total staked was updated
      const globalStateAfter = getGlobalState(provider, statePda);
      expect(globalStateAfter!.totalStaked).to.equal(
        globalStateBefore!.totalStaked - unstakeAmount
      );
    });

    it("should fail when unstaking more than staked amount", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );

      const stakeAmount = toToken(100);
      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        stakeAmount
      );

      const tooMuchAmount = stakeAmount + toToken(100); // Try to unstake more than staked
      try {
        await unstakeTokens(
          user,
          userSigner,
          stakingToken,
          tooMuchAmount
        );
        expect.fail("Transaction should have failed");
      } catch (error: any) {
        // Expected to fail
        expect(error).to.not.be.null;
      }

      // Verify stake amount didn't change
      const userStakePda = getUserStakePda(statePda, user.publicKey);
      const userStakeInfoAfter = getUserStakeInfo(provider, userStakePda);
      expect(userStakeInfoAfter!.amount.toString()).to.equal(
        stakeAmount.toString()
      );
    });

    it("should fail when unstaking zero tokens", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );

      // First stake some tokens
      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        toToken(100)
      );

      // Try to unstake 0 tokens
      try {
        await unstakeTokens(
          user,
          userSigner,
          stakingToken,
          BigInt(0) // Try to unstake 0 tokens
        );
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.toString()).to.include("Cannot unstake 0 tokens");
      }

      // Verify stake amount didn't change
      const userStakePda = getUserStakePda(statePda, user.publicKey);
      const userStakeInfo = getUserStakeInfo(provider, userStakePda);
      expect(userStakeInfo!.amount.toString()).to.equal(
        toToken(100).toString()
      );
    });

    it("should allow blacklisted user to unstake for safe exit", async () => {
      const { user: blacklistedUser, userSigner: blacklistedUserSigner } =
        await createTestUser(svm);
      const {
        stakingToken: blacklistedUserStakingToken,
        rewardToken: blacklistedUserRewardToken,
      } = await setupUserWithTokens(
        provider,
        admin,
        blacklistedUser,
        stakingMint,
        rewardMint
      );

      // First, stake some tokens before blacklisting
      await stakeTokens(
        blacklistedUser,
        blacklistedUserSigner,
        blacklistedUserStakingToken,
        blacklistedUserRewardToken,
        toToken(50)
      );

      // Add to blacklist
      const blacklistPda = getBlacklistPda(statePda, blacklistedUser.publicKey);

      const addToBlacklistInstruction =
        programClient.getAddToBlacklistInstruction({
          admin: adminSigner,
          systemProgram: address(SystemProgram.programId.toBase58()),
          poolConfig: address(statePda.toBase58()),
          blacklistEntry: address(blacklistPda.toBase58()),
          address: address(blacklistedUser.publicKey.toBase58()),
        });

      await sendTransaction(provider, addToBlacklistInstruction, admin);

      await unstakeTokens(
        blacklistedUser,
        blacklistedUserSigner,
        blacklistedUserStakingToken,
        toToken(50)
      );

      const userStakePda = getUserStakePda(statePda, blacklistedUser.publicKey);
      const userStakeInfo = getUserStakeInfo(provider, userStakePda);
      expect(userStakeInfo!.amount.toString()).to.equal("0");
    });
  });

  describe("Close User Stake Account", () => {
    beforeEach(async () => {
      await setupNewPool();
    });

    it("should close user stake account when amount and reward debt are zero", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );

      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        toToken(100)
      );
      await unstakeTokens(
        user,
        userSigner,
        stakingToken,
        toToken(100)
      );
      await claimUserRewards(user, userSigner, rewardToken);

      await closeUserStakeAccount(user, userSigner);

      const userStakePda = getUserStakePda(statePda, user.publicKey);
      const closedUserStake = provider.client.getAccount(userStakePda);
      expectClosedOrDrainedAccount(closedUserStake);
    });

    it("should fail to close user stake account when amount is not zero", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );

      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        toToken(10)
      );

      try {
        await closeUserStakeAccount(user, userSigner);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.toString()).to.include("UserStakeAmountNotZero");
      }
    });

    it("should not auto-claim rewards on full unstake — must claim separately", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );

      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        toToken(10)
      );
      const stateAfterStake = getGlobalState(provider, statePda);
      const oneDayLater =
        Number(stateAfterStake!.lastRewardTime.toString()) + SECONDS_IN_A_DAY;
      setNextBlockTimestamp(oneDayLater);

      // Full unstake — should NOT transfer rewards
      const rewardBalanceBefore = BigInt(
        getAccount(provider, rewardToken).amount
      );
      await unstakeTokens(
        user,
        userSigner,
        stakingToken,
        toToken(10)
      );
      const rewardBalanceAfter = BigInt(
        getAccount(provider, rewardToken).amount
      );
      expect(rewardBalanceAfter - rewardBalanceBefore).to.equal(BigInt(0));

      // Verify amount=0, reward_debt < 0 (unclaimed rewards preserved)
      const userStakePda = getUserStakePda(statePda, user.publicKey);
      const userStakeInfo = getUserStakeInfo(provider, userStakePda);
      expect(userStakeInfo).to.not.be.null;
      expect(userStakeInfo!.amount.toString()).to.equal("0");
      expect(BigInt(userStakeInfo!.rewardDebt.toString()) < BigInt(0)).to.be
        .true;

      // Cannot close account yet — reward_debt != 0
      try {
        await closeUserStakeAccount(user, userSigner);
        expect.fail("Should have thrown");
      } catch (e: any) {
        expect(e.toString()).to.include("UserRewardDebtNotZero");
      }

      // Claim rewards separately
      await claimUserRewards(user, userSigner, rewardToken);
      const rewardBalanceFinal = BigInt(
        getAccount(provider, rewardToken).amount
      );
      expect(rewardBalanceFinal - rewardBalanceBefore).to.equal(
        BigInt(SECONDS_IN_A_DAY) * REWARD_PER_SECOND
      );

      // Now reward_debt is 0, can close
      const stakeInfoAfterClaim = getUserStakeInfo(provider, userStakePda);
      expect(stakeInfoAfterClaim!.rewardDebt.toString()).to.equal("0");
      await closeUserStakeAccount(user, userSigner);

      const closedUserStake = provider.client.getAccount(userStakePda);
      expectClosedOrDrainedAccount(closedUserStake);
    });
  });

  describe("Pool Finalization", () => {
    beforeEach(async () => {
      await setupNewPool();
    });

    it("should allow admin to withdraw remaining rewards when no active stakes", async () => {
      const { rewardToken: adminRewardAccount } = await setupUserWithTokens(
        provider,
        admin,
        admin,
        stakingMint,
        rewardMint,
        BigInt(0)
      );

      const rewardVaultBefore = BigInt(
        getAccount(provider, rewardVaultPda).amount
      );
      const adminRewardBefore = BigInt(
        getAccount(provider, adminRewardAccount).amount
      );

      const withdrawAmount = toToken(100);
      await withdrawRemainingRewards(withdrawAmount);

      const rewardVaultAfter = BigInt(
        getAccount(provider, rewardVaultPda).amount
      );
      const adminRewardAfter = BigInt(
        getAccount(provider, adminRewardAccount).amount
      );
      expect(rewardVaultBefore - rewardVaultAfter).to.equal(withdrawAmount);
      expect(adminRewardAfter - adminRewardBefore).to.equal(withdrawAmount);
    });

    it("should fail withdraw_remaining_rewards for non-admin", async () => {
      const { user: randomUser, userSigner: randomUserSigner } =
        await createTestUser(svm, 5);
      const { rewardToken: randomUserRewardToken } = await setupUserWithTokens(
        provider,
        admin,
        randomUser,
        stakingMint,
        rewardMint,
        BigInt(0)
      );

      const instruction = programClient.getWithdrawRemainingRewardsInstruction({
        admin: randomUserSigner,
        poolConfig: address(statePda.toBase58()),
        poolState: address(poolStatePda.toBase58()),
        adminRewardAccount: address(randomUserRewardToken.toBase58()),
        rewardVault: address(rewardVaultPda.toBase58()),
        tokenProgram: address(TOKEN_PROGRAM_ID.toBase58()),
        amount: toToken(1),
      });

      try {
        await sendTransaction(provider, instruction, randomUser);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("should fail withdraw_remaining_rewards when pool has active stakers", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );
      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        toToken(1)
      );

      try {
        await withdrawRemainingRewards(toToken(1));
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.toString()).to.include("PoolHasActiveStakes");
      }
    });

    it("should protect reserved rewards from admin withdrawal after full unstake", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );

      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        toToken(10)
      );

      const stateAfterStake = getGlobalState(provider, statePda);
      const oneDayLater =
        Number(stateAfterStake!.lastRewardTime.toString()) + SECONDS_IN_A_DAY;
      setNextBlockTimestamp(oneDayLater);

      // Full unstake — rewards preserved in negative reward_debt
      await unstakeTokens(user, userSigner, stakingToken, toToken(10));

      const expectedRewards = BigInt(SECONDS_IN_A_DAY) * REWARD_PER_SECOND;
      const vaultBalance = BigInt(getAccount(provider, rewardVaultPda).amount);

      // Admin should NOT be able to withdraw the full vault — reserved rewards must be protected
      try {
        await withdrawRemainingRewards(vaultBalance);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.toString()).to.include("InsufficientRewardVaultBalance");
      }

      // Admin CAN withdraw the non-reserved portion
      const availableToWithdraw = vaultBalance - expectedRewards;
      await withdrawRemainingRewards(availableToWithdraw);

      // User can still claim their rewards
      await claimUserRewards(user, userSigner, rewardToken);
      const rewardBalance = BigInt(getAccount(provider, rewardToken).amount);
      expect(rewardBalance).to.equal(expectedRewards);
    });

    it("should fail close_pool when reward vault is not empty", async () => {
      try {
        await closePool();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.toString()).to.include("VaultNotEmpty");
      }
    });

    it("should close pool after rewards are drained", async () => {
      await withdrawRemainingRewards(toToken(5000));
      await closePool();

      const poolConfigAccount = provider.client.getAccount(statePda);
      const poolStateAccount = provider.client.getAccount(poolStatePda);
      const stakingTokenAccount = provider.client.getAccount(stakingTokenPda);
      const rewardVaultAccount = provider.client.getAccount(rewardVaultPda);

      expectClosedOrDrainedAccount(poolConfigAccount);
      expectClosedOrDrainedAccount(poolStateAccount);
      expectClosedOrDrainedAccount(stakingTokenAccount);
      expectClosedOrDrainedAccount(rewardVaultAccount);
    });

    it("should require cleanup before close_pool since it closes PDA accounts", async () => {
      const { user, userSigner } = await createTestUser(svm);
      const { stakingToken, rewardToken } = await setupUserWithTokens(
        provider,
        admin,
        user,
        stakingMint,
        rewardMint
      );

      await stakeTokens(
        user,
        userSigner,
        stakingToken,
        rewardToken,
        toToken(10)
      );
      await unstakeTokens(
        user,
        userSigner,
        stakingToken,
        toToken(10)
      );
      await claimUserRewards(user, userSigner, rewardToken);
      await addUserToBlacklist(user.publicKey);

      // Cleanup must happen before close_pool since it closes pool_config/pool_state PDAs
      await closeUserStakeAccount(user, userSigner);
      await removeUserFromBlacklist(user.publicKey);

      const userStakePda = getUserStakePda(statePda, user.publicKey);
      const blacklistPda = getBlacklistPda(statePda, user.publicKey);
      const closedUserStake = provider.client.getAccount(userStakePda);
      const closedBlacklist = provider.client.getAccount(blacklistPda);

      expectClosedOrDrainedAccount(closedUserStake);
      expectClosedOrDrainedAccount(closedBlacklist);

      await withdrawRemainingRewards(toToken(5000));
      await closePool();

      // Verify pool_config and pool_state are closed
      const poolConfigAccount = provider.client.getAccount(statePda);
      const poolStateAccount = provider.client.getAccount(poolStatePda);
      expectClosedOrDrainedAccount(poolConfigAccount);
      expectClosedOrDrainedAccount(poolStateAccount);
    });
  });

  describe("Blacklist", () => {
    beforeEach(async () => {
      await setupNewPool();
    });

    it("should add user to blacklist", async () => {
      const { user: blacklistedUser } = await createTestUser(svm);

      await addUserToBlacklist(blacklistedUser.publicKey);

      const blacklistPda = getBlacklistPda(statePda, blacklistedUser.publicKey);
      const blacklistEntry = getBlacklistEntry(provider, blacklistPda);
      expect(blacklistEntry).to.not.be.null;
    });

    it("should fail when adding same address to blacklist twice", async () => {
      const { user: blacklistedUser } = await createTestUser(svm);

      // First add to blacklist
      await addUserToBlacklist(blacklistedUser.publicKey);

      // Try to add again
      try {
        await addUserToBlacklist(blacklistedUser.publicKey);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error).to.not.be.null;
        expect(error.toString()).to.include("already in use");
      }
    });

    it("should remove user from blacklist", async () => {
      const { user: blacklistedUser, userSigner: blacklistedUserSigner } =
        await createTestUser(svm);
      const {
        stakingToken: blacklistedUserStakingToken,
        rewardToken: blacklistedUserRewardToken,
      } = await setupUserWithTokens(
        provider,
        admin,
        blacklistedUser,
        stakingMint,
        rewardMint
      );

      // First add to blacklist
      await addUserToBlacklist(blacklistedUser.publicKey);

      // Remove from blacklist
      await removeUserFromBlacklist(blacklistedUser.publicKey);

      // Verify blacklist entry is removed
      const blacklistPda = getBlacklistPda(statePda, blacklistedUser.publicKey);
      const blacklistAccount = provider.client.getAccount(blacklistPda);
      // In Solana, closed accounts may still exist with 0 lamports and system program as owner
      if (blacklistAccount) {
        expect(blacklistAccount.lamports).to.equal(0);
        expect(blacklistAccount.owner.toBase58()).to.equal(
          SystemProgram.programId.toBase58()
        );
        expect(blacklistAccount.data.length).to.equal(0);
      }

      // Now user should be able to stake
      await stakeTokens(
        blacklistedUser,
        blacklistedUserSigner,
        blacklistedUserStakingToken,
        blacklistedUserRewardToken,
        toToken(25)
      );

      // Verify stake was successful
      const userStakePda = getUserStakePda(statePda, blacklistedUser.publicKey);
      const userStakeInfo = getUserStakeInfo(provider, userStakePda);
      expect(userStakeInfo!.amount.toString()).to.equal(toToken(25).toString());
    });

    it("should prevent non-admin from managing blacklist", async () => {
      const { user: randomUser, userSigner: randomUserSigner } =
        await createTestUser(svm, 5);

      const { user: blacklistedUser } = await createTestUser(svm, 5);

      const blacklistPda = getBlacklistPda(statePda, blacklistedUser.publicKey);

      const addToBlacklistInstruction =
        programClient.getAddToBlacklistInstruction({
          admin: randomUserSigner,
          systemProgram: address(SystemProgram.programId.toBase58()),
          poolConfig: address(statePda.toBase58()),
          blacklistEntry: address(blacklistPda.toBase58()),
          address: address(blacklistedUser.publicKey.toBase58()),
        });

      try {
        await sendTransaction(provider, addToBlacklistInstruction, randomUser);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });
});
