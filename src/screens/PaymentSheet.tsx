import { useState } from "react";
import { money } from "@/data/mock";

interface Props {
  total: number;
  onClose: () => void;
  onConfirm: () => void;
}

const methods = ["Efectivo", "Tarjeta", "Transfer."] as const;
const quickAmounts = [400, 500, 1000];

export const PaymentSheet = ({ total, onClose, onConfirm }: Props) => {
  const [method, setMethod] = useState<(typeof methods)[number]>("Efectivo");
  const [received, setReceived] = useState(500);
  const cash = method === "Efectivo";
  const change = Math.max(received - total, 0);
  const canConfirm = !cash || received >= total;

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(8,5,4,0.72)]"
      />
      <div className="bg-surface relative flex flex-col gap-5 rounded-t-[28px] px-5 pt-2.5 pb-8">
        <div className="h-[5px] w-11 self-center rounded-full bg-[#5a4a42]" />
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
              <div className="border-gold bg-ink flex h-16 items-center rounded-[14px] border-2 px-[18px] text-[30px] font-black tabular-nums">
                {money(received)}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setReceived(total)}
                  className="bg-surface-2 h-12 rounded-xl text-[15px] font-bold"
                >
                  Exacto
                </button>
                {quickAmounts.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setReceived(a)}
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
        <button
          type="button"
          disabled={!canConfirm}
          onClick={onConfirm}
          className="bg-chili h-15 rounded-2xl text-xl font-black disabled:opacity-40"
        >
          Confirmar venta
        </button>
      </div>
    </div>
  );
};
