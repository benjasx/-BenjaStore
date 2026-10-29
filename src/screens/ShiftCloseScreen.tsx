import { useState } from "react";
import { Header, Screen } from "@/components/Screen";
import { money } from "@/data/mock";

interface Props {
  onBack: () => void;
  onClose: () => void;
}

const sales = [
  { label: "Efectivo", amount: 5180, bar: "bg-gold", width: "62%" },
  { label: "Tarjeta", amount: 2340, bar: "bg-chili", width: "27%" },
  { label: "Transferencia", amount: 900, bar: "bg-muted", width: "11%" },
];

const cashMovements = [
  { label: "Fondo inicial", amount: 500, plain: true },
  { label: "Ventas en efectivo", amount: 5180 },
  { label: "Retiro 18:30 · depósito", amount: -1000 },
  { label: "Retiro 20:45 · proveedor", amount: -1000 },
];

const signed = (n: number, plain?: boolean) =>
  n < 0 ? `−${money(-n)}` : plain ? money(n) : `+${money(n)}`;

const card =
  "flex flex-col gap-2.5 rounded-[18px] bg-surface p-4 text-base tabular-nums";

export const ShiftCloseScreen = ({ onBack, onClose }: Props) => {
  const [counted, setCounted] = useState(3650);
  const expected = cashMovements.reduce((sum, m) => sum + m.amount, 0);
  const diff = counted - expected;

  return (
    <Screen className="lg:max-w-160">
      <Header
        title="Cierre de turno"
        subtitle="Luis · 14:02 – 22:15 · 41 tickets"
        onBack={onBack}
      />
      <div className="flex flex-1 flex-col gap-3.5 px-5 pt-2">
        <section className={card}>
          <div className="text-muted flex justify-between">
            <span>Ventas totales</span>
            <span className="text-cream font-extrabold">$8,420</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-[5px]">
            {sales.map((s) => (
              <div key={s.label} className={s.bar} style={{ width: s.width }} />
            ))}
          </div>
          {sales.map((s) => (
            <div key={s.label} className="flex justify-between">
              <span className="flex items-center gap-2">
                <span className={`size-2.5 rounded-[3px] ${s.bar}`} />
                {s.label}
              </span>
              <span>{money(s.amount)}</span>
            </div>
          ))}
        </section>
        <section className={card}>
          <h2 className="text-muted text-[15px] font-bold">Efectivo en caja</h2>
          {cashMovements.map((m) => (
            <div key={m.label} className="flex justify-between">
              <span>{m.label}</span>
              <span>{signed(m.amount, m.plain)}</span>
            </div>
          ))}
          <div className="bg-line h-px" />
          <div className="flex justify-between font-extrabold">
            <span>Esperado</span>
            <span>{money(expected)}</span>
          </div>
        </section>
        <label className="flex flex-col gap-2">
          <span className="text-muted text-[15px] font-semibold">
            Efectivo contado
          </span>
          <div className="border-gold bg-surface flex h-15 items-center justify-between rounded-[14px] border-2 px-[18px] tabular-nums">
            <input
              type="number"
              inputMode="numeric"
              value={counted}
              onChange={(e) => setCounted(Number(e.target.value))}
              className="w-32 bg-transparent text-[26px] font-black outline-none"
            />
            {diff !== 0 && (
              <span
                className={`flex h-8 items-center rounded-2xl px-3 text-[15px] font-extrabold ${
                  diff < 0 ? "text-salmon bg-[#4a1712]" : "text-ok bg-[#173a1c]"
                }`}
              >
                {diff < 0 ? "Faltan" : "Sobran"} {money(Math.abs(diff))}
              </span>
            )}
          </div>
        </label>
      </div>
      <div className="grid grid-cols-[1fr_1.4fr] gap-2.5 px-5 pt-4 pb-8">
        <button
          type="button"
          className="border-line h-15 rounded-2xl border-[1.5px] text-[17px] font-extrabold"
        >
          Retiro
        </button>
        <button
          type="button"
          onClick={onClose}
          className="bg-chili h-15 rounded-2xl text-lg font-black"
        >
          Cerrar turno
        </button>
      </div>
    </Screen>
  );
};
