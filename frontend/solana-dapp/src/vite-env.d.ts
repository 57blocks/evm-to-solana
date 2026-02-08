/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CUSTOM_RPC_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
