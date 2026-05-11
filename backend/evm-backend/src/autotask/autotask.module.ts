import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../repositories/repositories.module";
import { PoolBalanceMonitorService } from "./pool-balance-monitor.service";
import { RewardBalanceReader } from "./reward-balance-reader";

@Module({
  imports: [RepositoriesModule],
  providers: [PoolBalanceMonitorService, RewardBalanceReader],
  exports: [PoolBalanceMonitorService, RewardBalanceReader],
})
export class AutotaskModule {}
