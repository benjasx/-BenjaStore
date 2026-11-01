// Stub de "virtual:pwa-register/react" para vitest (el plugin PWA no corre en pruebas).
export const useRegisterSW = () => ({
  needRefresh: [false, () => undefined] as const,
  offlineReady: [false, () => undefined] as const,
  updateServiceWorker: async () => undefined,
});
