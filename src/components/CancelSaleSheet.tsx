import { useState } from "react";
import {
  formatFolio,
  MAX_CANCEL_REASON,
  normalizeReason,
  type Sale,
} from "@/lib/sales";

interface Props {
  sale: Sale;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const CancelSaleSheet = ({ sale, onClose, onConfirm }: Props) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = normalizeReason(reason);

  const confirm = async () => {
    if (!clean) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(clean);
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "No se pudo cancelar la venta.",
      );
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
        aria-label={`Cancelar venta #${formatFolio(sale.folio)}`}
        className="bg-surface relative flex w-full max-w-md flex-col gap-4 rounded-t-[28px] px-5 pt-5 pb-8 lg:rounded-[28px]"
      >
        <h2 className="text-[22px] font-black">
          Cancelar venta #{formatFolio(sale.folio)}
        </h2>
        <p className="text-muted text-[15px]">
          La venta queda en el registro pero su dinero deja de contar como
          ingreso. No se puede deshacer.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-muted text-[15px] font-semibold">Motivo</span>
          <textarea
            value={reason}
            maxLength={MAX_CANCEL_REASON}
            rows={3}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Motivo"
            className="bg-surface-2 border-line focus:border-gold rounded-[14px] border-[1.5px] p-3.5 text-base outline-none"
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
            disabled={!clean || saving}
            onClick={confirm}
            className="bg-chili h-14 rounded-2xl text-lg font-black disabled:opacity-40"
          >
            {saving ? "Cancelando…" : "Cancelar venta"}
          </button>
        </div>
      </div>
    </div>
  );
};
