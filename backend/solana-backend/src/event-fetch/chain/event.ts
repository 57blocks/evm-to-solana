import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

export interface TransactionEventsParser {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseEvents(tx: any): BaseEvent[];
}

/**
 * EventClass type: only requires static eventName() and eventType() methods.
 * Constructor signature is not enforced since only static methods are called.
 */
export type EventClass = {
  eventName(): string;
  eventType(): string;
};

export interface TransactionEventsParserFactory {
  //TODO change to source: string
  createTransactionEventsParser(
    chainId: string | number,
    sources: string[],
    eventClasses: EventClass[],
    programId: string
  ): TransactionEventsParser;
}

export class BaseEvent {

  chainId: string | number;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  status: string;
  monitorAddress?: string;

  constructor(chainId: string | number,
              blockNumber: number,
              transactionHash: string,
              timestamp: number,
              status: string,
              monitorAddress?: string) {
    this.chainId = chainId;
    this.blockNumber = blockNumber;
    this.transactionHash = transactionHash;
    this.timestamp = timestamp;
    this.status = status;
    this.monitorAddress = monitorAddress;
  }

  static eventName(): string {
    return "none";
  }

  static eventType(): string {
    return "none";
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