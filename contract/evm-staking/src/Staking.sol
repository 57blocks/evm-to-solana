// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {RestrictedStakingToken} from "./RestrictedStakingToken.sol";

/// @title Staking (accRewardPerShare accounting)
/// @notice MasterChef-style reward distribution using a global accumulator
contract Staking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    IERC20 public stakingToken;
    IERC20 public rewardToken;

    // Fixed emission rate per second (immutable)
    // Note: SCREAMING_SNAKE_CASE to satisfy forge lint
    uint256 public immutable REWARD_PER_SECOND;

    // Pool-level accounting
    uint256 public accRewardPerShare; // Scaled by ACC_REWARD_PRECISION
    uint256 public lastRewardTime;
    uint256 public constant ACC_REWARD_PRECISION = 1e12;

    struct StakeInfo {
        uint256 amount; // Staked tokens
        int256 rewardDebt; // Accounting offset: amount * acc / PREC at last action
        uint256 claimed; // Cumulative claimed rewards (for UI/reporting)
    }

    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event RewardsFunded(address indexed funder, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    /// @param _stakingToken The token to be staked
    /// @param _rewardToken The reward token to distribute
    /// @param _rewardPerSecond Fixed emission rate per second
    constructor(
        address _stakingToken,
        address _rewardToken,
        uint256 _rewardPerSecond
    ) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        REWARD_PER_SECOND = _rewardPerSecond;
        lastRewardTime = block.timestamp;
    }

    /// @dev Update pool accumulator up to current timestamp
    function updatePool() public {
        uint256 currentTime = block.timestamp;
        if (currentTime <= lastRewardTime) {
            return;
        }
        uint256 lpSupply = totalStaked;
        if (lpSupply > 0) {
            uint256 timeElapsed = currentTime - lastRewardTime;
            uint256 reward = timeElapsed * REWARD_PER_SECOND;
            accRewardPerShare += (reward * ACC_REWARD_PRECISION) / lpSupply;
        }
        lastRewardTime = currentTime;
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");

        // Blacklist check
        RestrictedStakingToken restrictedToken = RestrictedStakingToken(
            address(stakingToken)
        );
        require(
            !restrictedToken.isBlacklisted(msg.sender),
            "Address is blacklisted"
        );

        updatePool();

        // Effects
        StakeInfo storage user = stakes[msg.sender];
        user.amount += amount;
        user.rewardDebt += int256(
            (amount * accRewardPerShare) / ACC_REWARD_PRECISION
        );
        totalStaked += amount;

        // Interactions
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot unstake 0");

        // Blacklist check
        RestrictedStakingToken restrictedToken = RestrictedStakingToken(
            address(stakingToken)
        );
        require(
            !restrictedToken.isBlacklisted(msg.sender),
            "Address is blacklisted"
        );

        StakeInfo storage user = stakes[msg.sender];
        require(user.amount >= amount, "Insufficient staked amount");

        updatePool();

        user.rewardDebt -= int256(
            (amount * accRewardPerShare) / ACC_REWARD_PRECISION
        );
        user.amount -= amount;
        totalStaked -= amount;

        // Interactions
        stakingToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external nonReentrant {
        // Blacklist check
        RestrictedStakingToken restrictedToken = RestrictedStakingToken(
            address(stakingToken)
        );
        require(
            !restrictedToken.isBlacklisted(msg.sender),
            "Address is blacklisted"
        );

        updatePool();

        StakeInfo storage user = stakes[msg.sender];
        int256 accumulated = int256(
            (user.amount * accRewardPerShare) / ACC_REWARD_PRECISION
        );
        int256 pendingSigned = accumulated - user.rewardDebt;
        user.rewardDebt = accumulated;
        if (pendingSigned > 0) {
            uint256 pending = uint256(pendingSigned);
            user.claimed += pending;
            rewardToken.safeTransfer(msg.sender, pending);
            emit RewardClaimed(msg.sender, pending);
        }
    }

    /// @notice Owner funds reward balance for future claims
    /// @dev Uses transferFrom; owner must approve this contract to pull reward tokens
    function fundRewards(uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardsFunded(msg.sender, amount);
    }

    /// @notice Emergency withdraw staked tokens without rewards
    function emergencyWithdraw() external nonReentrant {
        // Blacklist check
        RestrictedStakingToken restrictedToken = RestrictedStakingToken(
            address(stakingToken)
        );
        require(
            !restrictedToken.isBlacklisted(msg.sender),
            "Address is blacklisted"
        );

        StakeInfo storage user = stakes[msg.sender];
        uint256 amount = user.amount;
        require(amount > 0, "Nothing to withdraw");

        // Effects: forfeit rewards
        user.amount = 0;
        user.rewardDebt = 0;
        totalStaked -= amount;

        // Interactions
        stakingToken.safeTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    /// @notice View function to get pending rewards for a user
    function pendingReward(address userAddr) public view returns (uint256) {
        StakeInfo storage user = stakes[userAddr];
        uint256 _accRewardPerShare = accRewardPerShare;
        uint256 lpSupply = totalStaked;
        if (block.timestamp > lastRewardTime && lpSupply > 0) {
            uint256 timeElapsed = block.timestamp - lastRewardTime;
            uint256 reward = timeElapsed * REWARD_PER_SECOND;
            _accRewardPerShare += (reward * ACC_REWARD_PRECISION) / lpSupply;
        }
        int256 accumulated = int256(
            (user.amount * _accRewardPerShare) / ACC_REWARD_PRECISION
        );
        if (accumulated <= user.rewardDebt) {
            return 0;
        }
        return uint256(accumulated - user.rewardDebt);
    }

    function getStakeInfo(
        address user
    )
        external
        view
        returns (uint256 stakedAmount, uint256 pending, uint256 claimedReward)
    {
        StakeInfo storage u = stakes[user];
        return (u.amount, pendingReward(user), u.claimed);
    }
}
