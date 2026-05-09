import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AutotaskModule } from "./autotask/autotask.module";
import { configSchema } from "./config/config.schema";
import configuration from "./config/configuration";
import { IndexerModule } from "./indexer/indexer.module";
import { InfrastructureModule } from "./infrastructure/infrastructure.module";
import { RepositoriesModule } from "./repositories/repositories.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configSchema,
    }),
    ScheduleModule.forRoot(),
    InfrastructureModule,
    RepositoriesModule,
    IndexerModule,
    AutotaskModule,
  ],
})
export class AppModule {}
