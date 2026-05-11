import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../repositories/repositories.module";
import { RewardController } from "./reward.controller";
import { RewardService } from "./reward.service";

@Module({
  imports: [RepositoriesModule],
  controllers: [RewardController],
  providers: [RewardService],
})
export class RewardModule {}
