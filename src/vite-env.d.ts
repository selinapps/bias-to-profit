/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_BIAS_RPC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
