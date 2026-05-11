import { Module } from "@nestjs/common";
import { AlertRepository } from "./implementations/AlertRepository";
import { SyncStatusRepository } from "./implementations/SyncStatusRepository";
import { UserActivityRepository } from "./implementations/UserActivityRepository";

export const SYNC_STATUS_REPOSITORY = Symbol("SYNC_STATUS_REPOSITORY");
export const USER_ACTIVITY_REPOSITORY = Symbol("USER_ACTIVITY_REPOSITORY");
export const ALERT_REPOSITORY = Symbol("ALERT_REPOSITORY");

@Module({
  providers: [
    {
      provide: SYNC_STATUS_REPOSITORY,
      useClass: SyncStatusRepository,
    },
    {
      provide: USER_ACTIVITY_REPOSITORY,
      useClass: UserActivityRepository,
    },
    {
      provide: ALERT_REPOSITORY,
      useClass: AlertRepository,
    },
  ],
  exports: [
    SYNC_STATUS_REPOSITORY,
    USER_ACTIVITY_REPOSITORY,
    ALERT_REPOSITORY,
  ],
})
export class RepositoriesModule {}
