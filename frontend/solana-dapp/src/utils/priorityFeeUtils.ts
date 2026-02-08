export const DEFAULT_PRIORITY_FEE = 1;
export const DEFAULT_COMPUTE_UNITS = 200000;

export const filterValidFees = (fees: number[]): number[] => {
  return fees.filter((fee) => Number.isFinite(fee) && fee >= 0);
};

export const areAllFeesZero = (fees: number[]): boolean => {
  return fees.length === 0 || fees.every((fee) => fee === 0);
};

export const calculateRecommendedFee = (fees: number[]): number => {
  if (fees.length === 0) {
    return DEFAULT_PRIORITY_FEE;
  }

  const sorted = [...fees].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.75);
  const percentile = sorted[Math.min(idx, sorted.length - 1)];

  return Math.max(DEFAULT_PRIORITY_FEE, Math.ceil(percentile));
};

export const addSafetyMargin = (computeUnits: number): number => {
  const safeUnits = Math.ceil(computeUnits * 1.2);
  return Math.max(safeUnits, DEFAULT_COMPUTE_UNITS);
};
