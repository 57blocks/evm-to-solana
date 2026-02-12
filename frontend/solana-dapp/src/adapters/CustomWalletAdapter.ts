import {
  BaseWalletAdapter,
  WalletName,
  WalletReadyState,
  WalletConnectionError,
} from "@solana/wallet-adapter-base";
import {
  Connection,
  PublicKey,
  SendOptions,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";

/**
 * Configuration options for the CustomWalletAdapter.
 */
export interface CustomWalletConfig {
  name: WalletName;
  icon: string;
  url: string;
  deepLink: string;
}

/**
 * A custom wallet adapter for deep-link based mobile wallet integration.
 *
 * This adapter implements the WalletAdapter interface from @solana/wallet-adapter-base,
 * allowing it to be used seamlessly with WalletProvider alongside official adapters.
 *
 * Use case: Mobile fallback when official adapters don't support deep linking.
 */
export class CustomWalletAdapter extends BaseWalletAdapter {
  readonly name: WalletName;
  readonly icon: string;
  readonly url: string;
  readonly deepLink: string;
  readonly supportedTransactionVersions = new Set<"legacy" | 0>(["legacy", 0]);

  private _connecting: boolean = false;
  private _publicKey: PublicKey | null = null;
  private _readyState: WalletReadyState;

  constructor(config: CustomWalletConfig) {
    super();
    this.name = config.name;
    this.icon = config.icon;
    this.url = config.url;
    this.deepLink = config.deepLink;
    // Loadable: The wallet can be loaded (via deep link) but isn't installed as browser extension
    this._readyState = WalletReadyState.Loadable;
  }

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get connected(): boolean {
    return !!this._publicKey;
  }

  get readyState(): WalletReadyState {
    return this._readyState;
  }

  async autoConnect(): Promise<void> {
    // Deep link adapters should never auto-connect
    // Auto-redirect without user interaction is bad UX
    // Do nothing - require explicit user action to connect
  }

  async connect(): Promise<void> {
    try {
      // For deep link adapters, we only redirect to the wallet app
      // The actual connection happens in the wallet's in-app browser
      // We don't emit "connect" here because the connection isn't established yet
      window.location.href = this.deepLink;
    } catch (error) {
      this.emit("error", new WalletConnectionError((error as Error).message));
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this._publicKey = null;
    this.emit("disconnect");
  }

  async sendTransaction<T extends Transaction | VersionedTransaction>(
    _transaction: T,
    _connection: Connection,
    _options?: SendOptions
  ): Promise<TransactionSignature> {
    // Deep link adapters handle transactions within the wallet app
    // The actual signing happens after the deep link redirect
    throw new Error(
      "sendTransaction is handled by the wallet app after deep link redirect"
    );
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    _transaction: T
  ): Promise<T> {
    throw new Error(
      "signTransaction is handled by the wallet app after deep link redirect"
    );
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    _transactions: T[]
  ): Promise<T[]> {
    throw new Error(
      "signAllTransactions is handled by the wallet app after deep link redirect"
    );
  }

  async signMessage(_message: Uint8Array): Promise<Uint8Array> {
    throw new Error(
      "signMessage is handled by the wallet app after deep link redirect"
    );
  }
}
