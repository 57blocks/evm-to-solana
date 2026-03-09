// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Staking} from "../src/Staking.sol";
import {MyToken} from "../src/MyToken.sol";
import {RewardToken} from "../src/RewardToken.sol";

contract StakingTest is Test {
    using SafeERC20 for IERC20;
    Staking public staking;
    MyToken public myToken;
    RewardToken public rewardToken;

    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);

    uint256 constant INITIAL_BALANCE = 10000 * 10 ** 18;
    uint256 constant REWARD_SUPPLY = 1000000 * 10 ** 18;
    uint256 constant REWARD_PER_SECOND = 1e18; // 1 token/sec

    function setUp() public {
        vm.startPrank(owner);

        // Deploy tokens
        myToken = new MyToken();
        rewardToken = new RewardToken();

        // Deploy staking contract (fixed emission rate)
        staking = new Staking(address(myToken), address(rewardToken), REWARD_PER_SECOND);
        myToken.setBlacklistRecipientExemptSender(address(staking), true);

        // Transfer reward tokens to staking contract
        IERC20(address(rewardToken)).safeTransfer(address(staking), REWARD_SUPPLY);

        // Distribute tokens to users
        IERC20(address(myToken)).safeTransfer(user1, INITIAL_BALANCE);
        IERC20(address(myToken)).safeTransfer(user2, INITIAL_BALANCE);

        vm.stopPrank();
    }

    function testStake() public {
        uint256 stakeAmount = 1000 * 10 ** 18;

        vm.startPrank(user1);
        myToken.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        (uint256 stakedAmount,,) = staking.getStakeInfo(user1);
        assertEq(stakedAmount, stakeAmount);
        assertEq(staking.totalStaked(), stakeAmount);
    }

    function testUnstake() public {
        uint256 stakeAmount = 1000 * 10 ** 18;
        uint256 unstakeAmount = 500 * 10 ** 18;

        // First stake
        vm.startPrank(user1);
        myToken.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);

        // Then unstake
        staking.unstake(unstakeAmount);
        vm.stopPrank();

        (uint256 stakedAmount,,) = staking.getStakeInfo(user1);
        assertEq(stakedAmount, stakeAmount - unstakeAmount);
        assertEq(staking.totalStaked(), stakeAmount - unstakeAmount);
    }

    function testRewardCalculation() public {
        uint256 stakeAmount = 1000 * 10 ** 18;

        vm.startPrank(user1);
        myToken.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        // Fast forward 1 day
        vm.warp(block.timestamp + 1 days);

        // Single staker: pending equals time * rewardPerSecond
        uint256 expectedReward = 1 days * REWARD_PER_SECOND;
        uint256 actualPending = staking.pendingReward(user1);

        assertEq(actualPending, expectedReward);
    }

    function testClaimRewards() public {
        uint256 stakeAmount = 1000 * 10 ** 18;

        vm.startPrank(user1);
        myToken.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        // Fast forward 5 days
        vm.warp(block.timestamp + 5 days);

        uint256 expectedReward = 5 days * REWARD_PER_SECOND; // single staker
        uint256 balanceBefore = rewardToken.balanceOf(user1);

        vm.prank(user1);
        staking.claimRewards();

        uint256 balanceAfter = rewardToken.balanceOf(user1);
        assertEq(balanceAfter - balanceBefore, expectedReward);
    }

    function testMultipleStakes() public {
        uint256 firstStake = 500 * 10 ** 18;
        uint256 secondStake = 300 * 10 ** 18;

        vm.startPrank(user1);
        myToken.approve(address(staking), firstStake + secondStake);

        // First stake
        staking.stake(firstStake);

        // Fast forward 2 days
        vm.warp(block.timestamp + 2 days);

        // Second stake (should claim rewards first)
        staking.stake(secondStake);
        vm.stopPrank();

        (uint256 stakedAmount,,) = staking.getStakeInfo(user1);
        assertEq(stakedAmount, firstStake + secondStake);
    }

    function testCannotStakeZero() public {
        vm.prank(user1);
        vm.expectRevert("Cannot stake 0");
        staking.stake(0);
    }

    function testCannotUnstakeMoreThanStaked() public {
        uint256 stakeAmount = 1000 * 10 ** 18;

        vm.startPrank(user1);
        myToken.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);

        vm.expectRevert("Insufficient staked amount");
        staking.unstake(stakeAmount + 1);
        vm.stopPrank();
    }

    function testFundRewards() public {
        // Owner mints extra rewards and funds the contract via fundRewards
        vm.startPrank(owner);
        uint256 beforeBal = rewardToken.balanceOf(address(staking));
        rewardToken.mint(owner, 1000 ether);
        rewardToken.approve(address(staking), 1000 ether);
        staking.fundRewards(1000 ether);
        uint256 afterBal = rewardToken.balanceOf(address(staking));
        vm.stopPrank();

        assertEq(afterBal - beforeBal, 1000 ether);
    }

    function testWithdrawRemainingRewards() public {
        uint256 withdrawAmount = 1000 ether;
        uint256 ownerBalanceBefore = rewardToken.balanceOf(owner);
        uint256 stakingBalanceBefore = rewardToken.balanceOf(address(staking));

        vm.prank(owner);
        staking.withdrawRemainingRewards(withdrawAmount);

        uint256 ownerBalanceAfter = rewardToken.balanceOf(owner);
        uint256 stakingBalanceAfter = rewardToken.balanceOf(address(staking));

        assertEq(ownerBalanceAfter - ownerBalanceBefore, withdrawAmount);
        assertEq(stakingBalanceBefore - stakingBalanceAfter, withdrawAmount);
    }

    function testCannotWithdrawRemainingRewardsWithActiveStakes() public {
        uint256 stakeAmount = 1000 ether;

        vm.startPrank(user1);
        myToken.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        vm.prank(owner);
        vm.expectRevert("Pool has active stakes");
        staking.withdrawRemainingRewards(1 ether);
    }

    function testCannotWithdrawReservedRewardsAfterUserUnstakes() public {
        uint256 stakeAmount = 1000 ether;

        vm.startPrank(user1);
        myToken.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days);

        vm.prank(user1);
        staking.unstake(stakeAmount);

        assertEq(staking.totalStaked(), 0);
        assertEq(uint256(-staking.totalRewardDebt()), 1 days * REWARD_PER_SECOND);

        vm.prank(owner);
        vm.expectRevert("Insufficient withdrawable rewards");
        staking.withdrawRemainingRewards(REWARD_SUPPLY);

        vm.prank(owner);
        staking.withdrawRemainingRewards(REWARD_SUPPLY - (1 days * REWARD_PER_SECOND));

        uint256 balanceBefore = rewardToken.balanceOf(user1);
        vm.prank(user1);
        staking.claimRewards();
        uint256 balanceAfter = rewardToken.balanceOf(user1);

        assertEq(balanceAfter - balanceBefore, 1 days * REWARD_PER_SECOND);
        assertEq(staking.totalRewardDebt(), 0);
    }

    function testPreciseRewardCalculation() public {
        uint256 stakeAmount = 1000 * 10 ** 18;

        vm.startPrank(user1);
        myToken.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        // Fast forward 12 hours (0.5 days)
        vm.warp(block.timestamp + 12 hours);

        // Expected reward for 12 hours at fixed rate (single staker)
        uint256 expectedReward = 12 hours * REWARD_PER_SECOND;
        uint256 actualPending = staking.pendingReward(user1);

        assertEq(actualPending, expectedReward, "Reward calculation should be precise");

        // Claim rewards and verify pending becomes 0
        vm.prank(user1);
        staking.claimRewards();

        // Immediately check pending should be 0
        assertEq(staking.pendingReward(user1), 0, "Reward should be 0 right after claiming");

        // Fast forward another 6 hours
        vm.warp(block.timestamp + 6 hours);

        // Should only calculate reward for the last 6 hours
        uint256 expectedReward2 = 6 hours * REWARD_PER_SECOND;
        uint256 actualPending2 = staking.pendingReward(user1);

        assertEq(actualPending2, expectedReward2, "Should only calculate reward since last claim");
    }

    // Test that rewards accumulate properly without precision loss
    function testRewardPrecisionNoLoss() public {
        uint256 stakeAmount = 1000 * 10 ** 18;

        vm.startPrank(user1);
        myToken.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        // Fast forward 12 hours (0.5 days)
        vm.warp(block.timestamp + 12 hours);

        // We should get rewards for partial time windows
        uint256 reward1 = staking.pendingReward(user1);
        assertTrue(reward1 > 0, "Should have rewards for 12 hours");

        // Fast forward another 12 hours (total 1 day)
        vm.warp(block.timestamp + 12 hours);

        uint256 reward2 = staking.pendingReward(user1);
        uint256 expectedRewardForOneDay = 1 days * REWARD_PER_SECOND;
        assertEq(reward2, expectedRewardForOneDay, "Should have exactly 1 day worth of rewards");
    }

    // Test that claiming rewards doesn't reset staking duration
    function testClaimRewardsDoesNotResetDuration() public {
        uint256 stakeAmount = 1000 * 10 ** 18;

        vm.startPrank(user1);
        myToken.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        // Fast forward 12 hours
        vm.warp(block.timestamp + 12 hours);

        // Claim rewards
        vm.prank(user1);
        staking.claimRewards();

        // Fast forward another 12 hours (total 24 hours)
        vm.warp(block.timestamp + 12 hours);

        // Claim again
        uint256 balanceBefore = rewardToken.balanceOf(user1);
        vm.prank(user1);
        staking.claimRewards();
        uint256 balanceAfter = rewardToken.balanceOf(user1);

        // Should only get rewards for the second 12 hours (single staker)
        uint256 rewardForHalfDay = 12 hours * REWARD_PER_SECOND;
        assertEq(balanceAfter - balanceBefore, rewardForHalfDay, "Should only get rewards for time since last claim");
    }

    // Test multiple claims in short intervals
    function testMultipleClaimsShortIntervals() public {
        uint256 stakeAmount = 1000 * 10 ** 18;

        vm.startPrank(user1);
        myToken.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);

        uint256 totalRewardsClaimed = 0;

        // Claim every 6 hours for 2 days
        for (uint256 i = 0; i < 8; i++) {
            vm.warp(block.timestamp + 6 hours);
            uint256 balanceBefore = rewardToken.balanceOf(user1);
            staking.claimRewards();
            uint256 balanceAfter = rewardToken.balanceOf(user1);
            totalRewardsClaimed += (balanceAfter - balanceBefore);
        }

        vm.stopPrank();

        // Total rewards should equal 2 days * rewardPerSecond
        uint256 expectedTotalReward = 2 days * REWARD_PER_SECOND;
        assertEq(totalRewardsClaimed, expectedTotalReward, "Total rewards should equal 2 days worth");
    }
}
