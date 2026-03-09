// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2 as console} from "forge-std/console2.sol";
import {RestrictedStakingToken} from "../src/RestrictedStakingToken.sol";
import {RewardToken} from "../src/RewardToken.sol";
import {Staking} from "../src/Staking.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy tokens
        RestrictedStakingToken stakingToken = new RestrictedStakingToken("Restricted Staking Token", "RST");
        console.log("RestrictedStakingToken deployed at:", address(stakingToken));

        RewardToken rewardToken = new RewardToken();
        console.log("RewardToken deployed at:", address(rewardToken));

        // Configure fixed emission rate (tokens per second)
        uint256 rewardPerSecond = 1e18; // 1 token/sec

        // Deploy staking contract with fixed emission
        Staking staking = new Staking(address(stakingToken), address(rewardToken), rewardPerSecond);
        console.log("Staking contract deployed at:", address(staking));

        stakingToken.setBlacklistRecipientExemptSender(address(staking), true);
        console.log("Enabled safe-exit recipient exemption for staking contract");

        // Mint initial staking tokens to deployer (optional - for testing)
        uint256 stakingSupply = 1000000 * 10 ** 18; // 1M tokens
        stakingToken.mint(msg.sender, stakingSupply);
        console.log("Minted", stakingSupply / 10 ** 18, "staking tokens to deployer");

        // Fund initial reward tokens via staking.fundRewards (emits event)
        uint256 rewardSupply = 500000 * 10 ** 18; // 500k tokens for rewards
        rewardToken.approve(address(staking), rewardSupply);
        staking.fundRewards(rewardSupply);
        console.log("Funded", rewardSupply / 10 ** 18, "reward tokens to staking contract");

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("RestrictedStakingToken:", address(stakingToken));
        console.log("RewardToken:", address(rewardToken));
        console.log("Staking:", address(staking));
        console.log("========================\n");
    }
}
