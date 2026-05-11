import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createPublicClient, http, type PublicClient } from "viem";
import { sepolia } from "viem/chains";

@Injectable()
export class EVMClients {
  private readonly clients = new Map<number, PublicClient>();

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService
  ) {}

  getClient(chainId: number): PublicClient {
    const existing = this.clients.get(chainId);
    if (existing) {
      return existing;
    }

    const client = createPublicClient({
      chain: chainId === sepolia.id ? sepolia : undefined,
      transport: http(this.config.getOrThrow<string>("EVM_RPC_URL")),
    }) as PublicClient;
    this.clients.set(chainId, client);
    return client;
  }
}
