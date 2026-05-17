/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_BACKEND_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.md?raw" {
  const src: string;
  export default src;
}
