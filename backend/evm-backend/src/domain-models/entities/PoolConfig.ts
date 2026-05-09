export interface PoolConfigProps {
  chainId: number;
  stakingAddress: string;
  rewardTokenAddress: string;
  startBlock: number;
  name: string;
}

export class PoolConfig {
  readonly chainId: number;
  readonly stakingAddress: string;
  readonly rewardTokenAddress: string;
  readonly startBlock: number;
  readonly name: string;

  constructor(props: PoolConfigProps) {
    this.chainId = props.chainId;
    this.stakingAddress = props.stakingAddress.toLowerCase();
    this.rewardTokenAddress = props.rewardTokenAddress.toLowerCase();
    this.startBlock = props.startBlock;
    this.name = props.name;
  }

  get poolKey(): string {
    return `${this.chainId}:${this.stakingAddress}`;
  }
}
