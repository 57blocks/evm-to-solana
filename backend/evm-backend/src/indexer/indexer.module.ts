import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../repositories/repositories.module";
import { EventIndexingService } from "./event-indexing.service";

@Module({
  imports: [RepositoriesModule],
  providers: [EventIndexingService],
  exports: [EventIndexingService],
})
export class IndexerModule {}
