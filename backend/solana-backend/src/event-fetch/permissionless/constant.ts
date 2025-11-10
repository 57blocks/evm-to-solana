export enum InitCommitmentType {
  INITIAL_COMMITMENT_THREE_MONTHS,
  INITIAL_COMMITMENT_SIX_MONTHS,
  NO_COMMITMENT,
}

export const PermissionlessCommitmentMap: Record<string, number> = {
  [InitCommitmentType.NO_COMMITMENT]: 0,
  [InitCommitmentType.INITIAL_COMMITMENT_THREE_MONTHS]: 3,
  [InitCommitmentType.INITIAL_COMMITMENT_SIX_MONTHS]: 6,
};

export enum DEFI_PROTOCOLS {
  KAMINO = "kamino",
  KAMINO_LEND_PST = "kamino_lend_pst",
  KAMINO_LEND_PST_USDC = "kamino_lend_pst_usdc",
  RATEX = "ratex",
}

export const KAMINO_LEND_METADATA: Record<
  DEFI_PROTOCOLS.KAMINO_LEND_PST | DEFI_PROTOCOLS.KAMINO_LEND_PST_USDC,
  { reserve: string }
> = {
  [DEFI_PROTOCOLS.KAMINO_LEND_PST]: {
    reserve: "DzgYbR8HFQKf8YLCJ6M3E6ricB1xWAiNGZ2TB7X2KDHz",
  },
  [DEFI_PROTOCOLS.KAMINO_LEND_PST_USDC]: {
    reserve: "4QKFoFDzNFnvfkzVazABbCEfMwd3y1pZqUVzmpnkCphj",
  },
};

export enum ModeType {
  CLASSIC,
  MAXI,
}

export enum MultiplierFormula {
  MULTIPLY = 1,
  TANH = 2,
}

export enum StakingType {
  None,
  Daily,
  Monthly,
  Cliff,
  Constant,
}

export const PERMISSIONLESS_CONSTANT = {
  OG_NAME: "OG",
  RENEW_NAME: "RENEW",
  TANH_SCALE_FACTOR: 20,
  DEFAULT_MULTIPLIER_FORMULA: MultiplierFormula.TANH,
  CACHE_EXPIRATION_SECONDS: 20 * 60, // 20 minutes
};

export enum VanguardStatus {
  None = "none",
  Ontracking = "ontracking",
  Active = "active",
}
