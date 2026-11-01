import { useState } from "react";
import { isValidOpeningFloat, MAX_OPENING_FLOAT } from "@/lib/shifts";

interface Props {
  sellerName: string;
  onClose: () => void;
  onConfirm: (openingFloat: number) => Promise<void>;
}

export const OpenShiftSheet = ({ sellerName, onClose, onConfirm }: Props) => {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = value.trim() === "" ? NaN : Number(value);
  const valid = isValidOpeningFloat(amount);

  const confirm = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(amount);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "No se pudo abrir el turno.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-end lg:justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        disabled={saving}
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(8,5,4,0.72)]"
      />
      <div
        role="dialog"
        aria-label="Abrir turno"
        className="bg-surface relative flex w-full max-w-md flex-col gap-4 rounded-t-[28px] px-5 pt-5 pb-8 lg:rounded-[28px]"
      >
        <h2 className="text-[22px] font-black">Abrir turno</h2>
        <p className="text-muted text-[15px]">
          {sellerName}, ¿con cuánto efectivo inicias la caja?
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-muted text-[15px] font-semibold">
            Fondo inicial
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_OPENING_FLOAT}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Fondo inicial"
            className="bg-surface-2 border-line focus:border-gold h-14 rounded-[14px] border-[1.5px] px-3.5 text-[22px] font-black tabular-nums outline-none"
          />
        </label>
        {error && (
          <p role="alert" className="text-salmon text-[15px] font-bold">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="bg-surface-2 h-14 rounded-2xl text-lg font-bold disabled:opacity-40"
          >
            Volver
          </button>
          <button
            type="button"
            disabled={!valid || saving}
            onClick={confirm}
            className="bg-chili h-14 rounded-2xl text-lg font-black disabled:opacity-40"
          >
            {saving ? "Abriendo…" : "Abrir turno"}
          </button>
        </div>
      </div>
    </div>
  );
};
