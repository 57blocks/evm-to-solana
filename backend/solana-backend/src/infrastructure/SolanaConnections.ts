import { Connection } from "@solana/web3.js";
import { RPC_BY_CHAINS } from "../event-fetch/chain/chain";

/**
 * SolanaConnections
 * Shared dependency for all modules; handles all Solana RPC interactions.
 * Manages connections uniformly to avoid duplicate connections.
 */
export class SolanaConnections {
  private rpc: string;
  private connectionMap: Map<string | number, Connection> = new Map();

  constructor(rpc: string) {
    this.rpc = rpc;
  }

  /**
   * Returns the Connection for the given chainId.
   * Creates and caches the connection if it does not exist.
   */
  getConnection(chainId: string | number): Connection {
    let connection: Connection | undefined = this.connectionMap.get(chainId);
    if (!connection) {
      connection = this.createRpcConnection(this.rpc, chainId);
      this.connectionMap.set(chainId, connection);
    }
    return connection;
  }

  /**
   * Creates an RPC connection.
   * Prefers the provided rpc; falls back to RPC_BY_CHAINS.
   */
  private createRpcConnection(rpc: string, chainId: string | number): Connection {
    if (rpc) {
      return new Connection(rpc, "confirmed");
    }
    if (chainId in RPC_BY_CHAINS) {
      return new Connection(RPC_BY_CHAINS[chainId], "confirmed");
    } else {
      console.error(`Chain ID ${chainId} is not solana chain`);
      throw new Error(`Chain ID ${chainId} is not solana chain`);
    }
  }
}

