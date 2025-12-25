import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

export interface TransactionEventsParser {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseEvents(tx: any): BaseEvent[];
}

/**
 * EventClass 类型定义：只要求类有静态方法 eventName() 和 eventType()
 * 不要求构造函数签名匹配，因为实际使用时只调用静态方法
 */
export type EventClass = {
  eventName(): string;
  eventType(): string;
};

export interface TransactionEventsParserFactory {
  //TODO change to source: string
  createTransactionEventsParser(
    chainId: number,
    sources: string[],
    eventClasses: EventClass[]
  ): TransactionEventsParser;
}

export class BaseEvent {

  chainId: number;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  status: string;
  monitorAddress?: string;

  constructor(chainId: number,
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
