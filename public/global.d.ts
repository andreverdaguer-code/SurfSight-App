interface Window {
  credentialStore?: {
    save:  (email: string, password: string) => Promise<{ ok: boolean }>;
    load:  () => Promise<{ email: string; password: string } | null>;
    clear: () => Promise<{ ok: boolean }>;
  };
}
