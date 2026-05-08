import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SolanaConnections } from "../infrastructure/SolanaConnections";
import { PrismaService } from "../infrastructure/prisma.service";
import { CHAIN_ID } from "../event-fetch/chain/chain";
import { PoolRepository } from "./implementations/PoolRepository";
import { SyncStatusRepository } from "./implementations/SyncStatusRepository";
import { UserActivityRepository } from "./implementations/UserActivityRepository";
import { AlertRepository } from "../autotask/alert.repository";

export const SYNC_STATUS_REPOSITORY = "SYNC_STATUS_REPOSITORY";
export const USER_ACTIVITY_REPOSITORY = "USER_ACTIVITY_REPOSITORY";
export const POOL_REPOSITORY = "POOL_REPOSITORY";
export const ALERT_REPOSITORY = "ALERT_REPOSITORY";

@Module({
  providers: [
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
          config.get<number>("CHAIN_ID") ?? CHAIN_ID.SolanaDevnet
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
    ALERT_REPOSITORY,
  ],
})
export class RepositoriesModule {}
