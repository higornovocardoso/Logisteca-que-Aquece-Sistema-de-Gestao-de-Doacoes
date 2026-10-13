/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** "memoria" para navegação sem alterar a URL */
  readonly VITE_ROTEADOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
