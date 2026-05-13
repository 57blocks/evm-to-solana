import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SolanaConnections } from "../infrastructure/SolanaConnections";
import { PrismaService } from "../infrastructure/prisma.service";
import { CHAIN_ID } from "../event-fetch/chain/chain";
import { PoolRepository } from "./implementations/PoolRepository";
import { SyncStatusRepository } from "./implementations/SyncStatusRepository";
import { UserActivityRepository } from "./implementations/UserActivityRepository";
import { UserStakePositionRepository } from "./implementations/UserStakePositionRepository";
import { AlertRepository } from "../autotask/alert.repository";
import { RewardCalculationService } from "../domain-services/RewardCalculationService";

export const SYNC_STATUS_REPOSITORY = "SYNC_STATUS_REPOSITORY";
export const USER_ACTIVITY_REPOSITORY = "USER_ACTIVITY_REPOSITORY";
export const POOL_REPOSITORY = "POOL_REPOSITORY";
export const USER_STAKE_POSITION_REPOSITORY = "USER_STAKE_POSITION_REPOSITORY";
export const ALERT_REPOSITORY = "ALERT_REPOSITORY";

@Module({
  providers: [
    RewardCalculationService,
    {
      provide: SYNC_STATUS_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prismaService: PrismaService) =>
        new SyncStatusRepository(prismaService.client),
    },
    {
      provide: USER_ACTIVITY_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prismaService: PrismaService) =>
        new UserActivityRepository(prismaService.client),
    },
    {
      provide: POOL_REPOSITORY,
      inject: [SolanaConnections, ConfigService],
      useFactory: (solanaConnections: SolanaConnections, config: ConfigService) =>
        new PoolRepository(
          solanaConnections,
          config.get<string>("CHAIN_ID") ?? CHAIN_ID.SolanaDevnet
        ),
    },
    {
      provide: USER_STAKE_POSITION_REPOSITORY,
      inject: [SolanaConnections, ConfigService, POOL_REPOSITORY, RewardCalculationService],
      useFactory: (
        solanaConnections: SolanaConnections,
        config: ConfigService,
        poolRepository: PoolRepository,
        rewardCalculator: RewardCalculationService,
      ) =>
        new UserStakePositionRepository(
          solanaConnections,
          config.get<string>("CHAIN_ID") ?? CHAIN_ID.SolanaDevnet,
          poolRepository,
          rewardCalculator,
        ),
    },
    {
      provide: ALERT_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prismaService: PrismaService) =>
        new AlertRepository(prismaService.client),
    },
  ],
  exports: [
    SYNC_STATUS_REPOSITORY,
    USER_ACTIVITY_REPOSITORY,
    POOL_REPOSITORY,
    USER_STAKE_POSITION_REPOSITORY,
    ALERT_REPOSITORY,
    RewardCalculationService,
  ],
})
export class RepositoriesModule {}
