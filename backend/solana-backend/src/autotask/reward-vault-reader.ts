import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PublicKey } from "@solana/web3.js";
import StakingIDL from "../../idl/solana_staking.json";
import { CHAIN_ID } from "../event-fetch/chain/chain";
import { SolanaConnections } from "../infrastructure/SolanaConnections";
import { REWARD_VAULT_SEED } from "../repositories/constants";

export interface RewardVaultBalance {
  rewardVault: string;
  uiAmount: number;
  rawAmount: string;
}

@Injectable()
export class RewardVaultReader {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService,
    @Inject(SolanaConnections)
    private readonly solanaConnections: SolanaConnections
  ) {}

  async getRewardVaultBalance(poolConfig: string): Promise<RewardVaultBalance> {
    const programId = new PublicKey(
      this.config.get<string>("PROGRAM_ID") || StakingIDL.address
    );
    const poolConfigPda = new PublicKey(poolConfig);
    const [rewardVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(REWARD_VAULT_SEED), poolConfigPda.toBuffer()],
      programId
    );

    const connection = this.solanaConnections.getConnection(
      this.config.get<string>("CHAIN_ID") ?? CHAIN_ID.SolanaDevnet
    );
    const balance = await connection.getTokenAccountBalance(rewardVaultPda);
    const rawAmount = balance.value.amount;
    const uiAmount =
      balance.value.uiAmount ??
      Number(rawAmount) / 10 ** balance.value.decimals;

    return {
      rewardVault: rewardVaultPda.toBase58(),
      uiAmount,
      rawAmount,
    };
  }
}
