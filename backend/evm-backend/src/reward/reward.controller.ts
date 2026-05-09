import { Controller, Get, Param, HttpException, HttpStatus, Inject } from "@nestjs/common";
import { RewardService, UserRewardResponse } from "./reward.service";

@Controller("api/rewards")
export class RewardController {
  constructor(@Inject(RewardService) private readonly rewardService: RewardService) {}

  @Get(":userAddress")
  async getUserRewards(
    @Param("userAddress") userAddress: string,
  ): Promise<UserRewardResponse> {
    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      throw new HttpException(
        "Invalid Ethereum wallet address format. Expected: 0x followed by 40 hex characters.",
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.rewardService.getUserRewards(userAddress);
  }
}
