export interface SyncStatusProps {
  poolKey: string;
  chainId: number;
  contractAddress: string;
  rewardTokenAddress: string;
  name: string;
  lastSyncedBlock: number;
  initializeBlock: number;
}

export class SyncStatus {
  readonly poolKey: string;
  readonly chainId: number;
  readonly contractAddress: string;
  readonly rewardTokenAddress: string;
  readonly name: string;
  readonly lastSyncedBlock: number;
  readonly initializeBlock: number;

  constructor(props: SyncStatusProps) {
    this.poolKey = props.poolKey;
    this.chainId = props.chainId;
    this.contractAddress = props.contractAddress.toLowerCase();
    this.rewardTokenAddress = props.rewardTokenAddress.toLowerCase();
    this.name = props.name;
    this.lastSyncedBlock = props.lastSyncedBlock;
    this.initializeBlock = props.initializeBlock;
  }

  updateLastSyncedBlock(lastSyncedBlock: number): SyncStatus {
    return new SyncStatus({
      poolKey: this.poolKey,
      chainId: this.chainId,
      contractAddress: this.contractAddress,
      rewardTokenAddress: this.rewardTokenAddress,
      name: this.name,
      lastSyncedBlock,
      initializeBlock: this.initializeBlock,
    });
  }
}
