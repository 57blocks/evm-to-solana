import dayjs from "dayjs";

export interface TransactionEventsParser {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseEvents(tx: any): BaseEvent[];
}

export interface TransactionEventsParserFactory {
  //TODO change to source: string
  createTransactionEventsParser(
    chainId: number,
    sources: string[],
    eventClasses: (typeof BaseEvent)[]
  ): TransactionEventsParser;
}

export class BaseEvent {
  static eventNames(): string[] {
    return [];
  }

  static eventType(): string {
    return "none";
  }

  chainId: number;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  status: string;
  monitorAddress: string;

  constructor(chainId: number,
              blockNumber: number,
              transactionHash: string,
              timestamp: number,
              status: string,
              monitorAddress: string) {
    this.chainId = chainId;
    this.blockNumber = blockNumber;
    this.transactionHash = transactionHash;
    this.timestamp = timestamp;
    this.status = status;
    this.monitorAddress = monitorAddress;
  }


  getEventTime(): dayjs.Dayjs {
    return dayjs.unix(this.timestamp).utc();
  }

  toString() {
    return `${this.constructor.name} - ${Object.entries(this)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ")}`;
  }
}

export class InvalidDepositTransactionError {
  message: string;
  constructor(message: string) {
    this.message = message;
  }
}
