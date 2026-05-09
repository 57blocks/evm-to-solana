import { Global, Module } from "@nestjs/common";
import { EVMClients } from "./EVMClients";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [EVMClients, PrismaService],
  exports: [EVMClients, PrismaService],
})
export class InfrastructureModule {}
