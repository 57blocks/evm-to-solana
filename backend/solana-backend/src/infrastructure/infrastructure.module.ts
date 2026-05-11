import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SolanaConnections } from "./SolanaConnections";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: SolanaConnections,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new SolanaConnections(config.getOrThrow<string>("SOLANA_RPC_URL")),
    },
  ],
  exports: [PrismaService, SolanaConnections],
})
export class InfrastructureModule {}
