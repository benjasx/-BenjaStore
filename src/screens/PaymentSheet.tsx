import { useState } from "react";
import { money } from "@/data/mock";
import type { Payment, PaymentMethod } from "@/lib/sales";

interface Props {
  total: number;
  onClose: () => void;
  onConfirm: (payment: Payment) => Promise<void>;
}

const methods: readonly PaymentMethod[] = ["Efectivo", "Tarjeta", "Transfer."];
const quickAmounts = [200, 500, 1000];

export const PaymentSheet = ({ total, onClose, onConfirm }: Props) => {
  const [method, setMethod] = useState<PaymentMethod>("Efectivo");
  const [receivedText, setReceivedText] = useState("500");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const cash = method === "Efectivo";
  const received = receivedText === "" ? 0 : Number(receivedText);
  const change = Math.max(received - total, 0);
  const canConfirm =
    (!cash || (Number.isFinite(received) && received >= total)) && !saving;

  const confirm = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await onConfirm({
        method,
        ...(cash && { received }),
        ...(!cash && reference.trim() && { reference: reference.trim() }),
      });
    } catch (error) {
      console.error(error);
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end lg:fixed lg:items-center lg:justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        disabled={saving}
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(8,5,4,0.72)]"
      />
      <div className="bg-surface relative flex flex-col gap-5 rounded-t-[28px] px-5 pt-2.5 pb-8 lg:w-full lg:max-w-md lg:rounded-[28px] lg:px-6 lg:pt-6">
        <div className="h-[5px] w-11 self-center rounded-full bg-[#5a4a42] lg:hidden" />
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-black">Cobrar</h2>
          <span className="font-marker text-gold text-4xl leading-none">
            {money(total)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`h-16 rounded-[14px] text-base ${
                m === method
                  ? "bg-cream text-ink font-extrabold"
                  : "bg-surface-2 font-bold"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {cash && (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-muted text-[15px] font-semibold">
                Recibido
              </span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={receivedText}
                onChange={(e) => setReceivedText(e.target.value)}
                aria-label="Monto recibido"
                placeholder="Otra cantidad"
                className="border-gold bg-ink h-16 rounded-[14px] border-2 px-[18px] text-[30px] font-black tabular-nums outline-none"
              />
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setReceivedText(String(total))}
                  className="bg-surface-2 h-12 rounded-xl text-[15px] font-bold"
                >
                  Exacto
                </button>
                {quickAmounts.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setReceivedText(String(a))}
                    className={`h-12 rounded-xl text-base ${
                      a === received
                        ? "border-gold bg-surface-3 border-[1.5px] font-extrabold"
                        : "bg-surface-2 font-bold"
                    }`}
                  >
                    {money(a)}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-ink flex items-center justify-between rounded-2xl px-[18px] py-4">
              <span className="text-lg font-extrabold">Cambio</span>
              <span className="font-marker text-ok text-[44px] leading-none">
                {money(change)}
              </span>
            </div>
          </>
        )}
        {!cash && (
          <label className="flex flex-col gap-2">
            <span className="text-muted text-[15px] font-semibold">
              Folio de la transacción (opcional)
            </span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              aria-label="Folio de la transacción"
              autoComplete="off"
              className="border-line bg-ink focus:border-gold h-14 rounded-[14px] border-[1.5px] px-4 text-lg font-bold outline-none"
            />
          </label>
        )}
        {failed && (
          <p role="alert" className="text-salmon text-[15px] font-bold">
            No se pudo guardar la venta. Revisa la conexión e inténtalo de
            nuevo.
          </p>
        )}
        <button
          type="button"
          disabled={!canConfirm}
          onClick={confirm}
          className="bg-chili h-15 rounded-2xl text-xl font-black disabled:opacity-40"
        >
          {saving ? "Guardando…" : "Confirmar venta"}
        </button>
      </div>
    </div>
  );
};
