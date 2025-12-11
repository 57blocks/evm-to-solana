import { Connection } from "@solana/web3.js";
import { RPC_BY_CHAINS } from "../event-fetch/chain/chain";

/**
 * SolanaService
 * 所有模块的公共依赖，负责所有与 Solana RPC 的交互
 * 提供统一的 Connection 管理，避免重复创建连接
 */
export class SolanaService {
  private rpc: string;
  private connectionMap: Map<number, Connection> = new Map();

  constructor(rpc: string) {
    this.rpc = rpc;
  }

  /**
   * 获取指定 chainId 的 Connection
   * 如果连接不存在，则创建并缓存
   */
  getConnection(chainId: number): Connection {
    let connection: Connection | undefined = this.connectionMap.get(chainId);
    if (!connection) {
      connection = this.createRpcConnection(this.rpc, chainId);
      this.connectionMap.set(chainId, connection);
    }
    return connection;
  }

  /**
   * 创建 RPC 连接
   * 优先使用传入的 rpc，如果没有则使用默认的 RPC_BY_CHAINS
   */
  private createRpcConnection(rpc: string, chainId: number): Connection {
    console.log(`rpc env - ${rpc} default - ${RPC_BY_CHAINS[chainId]}`);
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

