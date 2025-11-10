export class HumaPointsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HumaPointsError";
  }
}
