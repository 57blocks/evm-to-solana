import { Controller, Get, Param, HttpException, HttpStatus, Inject } from "@nestjs/common";
import { PublicKey } from "@solana/web3.js";
import { RewardService, SolanaUserRewardResponse } from "./reward.service";

@Controller("api/rewards")
export class RewardController {
  constructor(@Inject(RewardService) private readonly rewardService: RewardService) {}

  @Get(":userAddress")
  async getUserRewards(
    @Param("userAddress") userAddress: string,
  ): Promise<SolanaUserRewardResponse> {
    if (!userAddress || !this.isValidSolanaAddress(userAddress)) {
      throw new HttpException(
        "Invalid Solana wallet address format. Expected: base58-encoded 32-byte public key.",
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.rewardService.getUserRewards(userAddress);
  }

  private isValidSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}
