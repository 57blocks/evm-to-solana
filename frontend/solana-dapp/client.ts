import {
  Rpc,
  RpcSubscriptions,
  SolanaRpcApi,
  SolanaRpcSubscriptionsApi,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
} from "@solana/kit";

export type Client = {
  rpc: Rpc<SolanaRpcApi>;
  rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
};

let client: Client | undefined;

export function createClient(): Client {
  if (!client) {
    client = {
      rpc: createSolanaRpc("https://api.devnet.solana.com"),
      rpcSubscriptions: createSolanaRpcSubscriptions(
        "wss://api.devnet.solana.com"
      ),
    };
  }
  return client;
}
