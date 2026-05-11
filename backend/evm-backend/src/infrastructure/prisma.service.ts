import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { getPrismaClient } from "./PrismaClient";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client = getPrismaClient();

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
