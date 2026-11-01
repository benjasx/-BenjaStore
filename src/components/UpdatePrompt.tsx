import { useRegisterSW } from "virtual:pwa-register/react";

export const UpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="bg-surface-2 border-line fixed right-4 bottom-24 left-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-[14px] border-[1.5px] p-3.5 lg:bottom-6"
    >
      <span className="text-[15px] font-bold">Nueva versión disponible</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="text-muted h-11 rounded-xl px-3 text-base font-semibold"
        >
          Luego
        </button>
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="bg-gold text-ink h-11 rounded-xl px-4 text-base font-extrabold"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
};
