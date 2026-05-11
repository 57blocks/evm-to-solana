export interface AlertRecord {
  id?: string;
  poolKey: string;
  alertType: string;
  message: string;
  threshold: string;
  actualValue: string;
  createdAt: number;
  resolved: boolean;
}

export interface IAlertRepository {
  findOpenAlert(poolKey: string, alertType: string): Promise<AlertRecord | null>;
  resolveOpenAlert(poolKey: string, alertType: string): Promise<void>;
  save(alert: AlertRecord): Promise<void>;
}
