/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly COUPANG_ACCESS_KEY?: string;
  readonly COUPANG_SECRET_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
