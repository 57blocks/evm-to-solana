import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../repositories/repositories.module";
import { PoolBalanceMonitorService } from "./pool-balance-monitor.service";
import { RewardVaultReader } from "./reward-vault-reader";

@Module({
  imports: [RepositoriesModule],
  providers: [RewardVaultReader, PoolBalanceMonitorService],
})
export class AutotaskModule {}
