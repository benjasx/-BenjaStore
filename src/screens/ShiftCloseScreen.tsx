import { useState } from "react";
import { Header, Screen } from "@/components/Screen";
import { ErrorBanner } from "@/components/ProductsState";
import { money } from "@/data/mock";
import { useShiftSales } from "@/hooks/useShiftSales";
import type { PaymentMethod } from "@/lib/sales";
import {
  addWithdrawal,
  buildCut,
  closeShift,
  isValidCounted,
  type Shift,
  type ShiftCut,
  type Withdrawal,
} from "@/lib/shifts";
import { WithdrawalSheet } from "@/components/WithdrawalSheet";

interface Props {
  shift: Shift | null;
  onBack: () => void;
  startWithdrawing?: boolean;
  onWithdrawal: (w: Withdrawal) => void;
  onExit: () => void;
}

const methods: { method: PaymentMethod; bar: string }[] = [
  { method: "Efectivo", bar: "bg-gold" },
  { method: "Tarjeta", bar: "bg-chili" },
  { method: "Transfer.", bar: "bg-muted" },
];

const hhmm = (d: Date) =>
  d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const card =
  "flex flex-col gap-2.5 rounded-[18px] bg-surface p-4 text-base tabular-nums";

export const ShiftCloseScreen = ({
  shift,
  onBack,
  startWithdrawing = false,
  onWithdrawal,
  onExit,
}: Props) => {
  const { sales, loading, error, retry } = useShiftSales(shift?.id ?? null);
  const [countedText, setCountedText] = useState("");
  const [withdrawing, setWithdrawing] = useState(startWithdrawing);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closed, setClosed] = useState<ShiftCut | null>(null);

  if (!shift) {
    return (
      <Screen className="lg:max-w-160">
        <Header title="Cierre de turno" onBack={onBack} />
        <p className="text-muted px-5 py-6 text-[15px]">
          No hay un turno abierto. Entra con tu PIN para abrir uno.
        </p>
      </Screen>
    );
  }

  const counted = countedText.trim() === "" ? NaN : Number(countedText);
  const hasCounted = isValidCounted(counted);
  const cut = buildCut(shift, sales, hasCounted ? counted : 0);
  const diff = cut.difference;
  const ready = !loading && !error;

  const close = async () => {
    if (!hasCounted) return;
    setClosing(true);
    setCloseError(null);
    try {
      setClosed(await closeShift(shift.id, counted));
    } catch (e) {
      console.error(e);
      setCloseError(
        e instanceof Error ? e.message : "No se pudo cerrar el turno.",
      );
    } finally {
      setClosing(false);
    }
  };

  if (closed) {
    const withdrawn = shift.withdrawals.reduce((n, w) => n + w.amount, 0);
    const d = closed.difference;
    return (
      <Screen className="lg:max-w-160">
        <Header
          title="Turno cerrado"
          subtitle={`${shift.seller.name} · ${hhmm(shift.openedAt.toDate())} – ${hhmm(new Date())} · ${closed.tickets} tickets`}
        />
        <div className="flex flex-1 flex-col gap-3.5 px-5 pt-2">
          <section className={card}>
            <div className="text-muted flex justify-between">
              <span>Ventas totales</span>
              <span className="text-cream font-extrabold">
                {money(closed.total)}
              </span>
            </div>
            {methods.map((m) => (
              <div key={m.method} className="flex justify-between">
                <span>{m.method}</span>
                <span>{money(closed.byMethod[m.method])}</span>
              </div>
            ))}
          </section>
          <section className={card}>
            <h2 className="text-muted text-[15px] font-bold">
              Efectivo en caja
            </h2>
            <div className="flex justify-between">
              <span>Fondo inicial</span>
              <span>{money(shift.openingFloat)}</span>
            </div>
            <div className="flex justify-between">
              <span>Ventas en efectivo</span>
              <span>+{money(closed.byMethod.Efectivo)}</span>
            </div>
            <div className="flex justify-between">
              <span>Retiros</span>
              <span>−{money(withdrawn)}</span>
            </div>
            <div className="bg-line h-px" />
            <div className="flex justify-between font-extrabold">
              <span>Esperado</span>
              <span>{money(closed.expected)}</span>
            </div>
            <div className="flex justify-between font-extrabold">
              <span>Contado</span>
              <span>{money(closed.counted)}</span>
            </div>
            <div
              className={`flex justify-between font-extrabold ${
                d < 0 ? "text-salmon" : d > 0 ? "text-ok" : ""
              }`}
            >
              <span>{d < 0 ? "Faltan" : d > 0 ? "Sobran" : "Diferencia"}</span>
              <span>{money(Math.abs(d))}</span>
            </div>
          </section>
        </div>
        <div className="px-5 pt-4 pb-8">
          <button
            type="button"
            onClick={onExit}
            className="bg-chili h-15 w-full rounded-2xl text-lg font-black"
          >
            Salir
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen className="lg:max-w-160">
      <Header
        title="Cierre de turno"
        subtitle={`${shift.seller.name} · ${hhmm(shift.openedAt.toDate())} – ${hhmm(new Date())} · ${ready ? cut.tickets : "–"} tickets`}
        onBack={onBack}
      />
      {error && (
        <ErrorBanner
          onRetry={retry}
          message="No se pudieron cargar las ventas del turno."
        />
      )}
      <div className="flex flex-1 flex-col gap-3.5 px-5 pt-2">
        <section className={card}>
          <div className="text-muted flex justify-between">
            <span>Ventas totales</span>
            <span className="text-cream font-extrabold">
              {ready ? money(cut.total) : "—"}
            </span>
          </div>
          {ready && cut.total > 0 && (
            <div className="flex h-2.5 overflow-hidden rounded-[5px]">
              {methods.map((m) => (
                <div
                  key={m.method}
                  className={m.bar}
                  style={{
                    width: `${(cut.byMethod[m.method] / cut.total) * 100}%`,
                  }}
                />
              ))}
            </div>
          )}
          {methods.map((m) => (
            <div key={m.method} className="flex justify-between">
              <span className="flex items-center gap-2">
                <span className={`size-2.5 rounded-[3px] ${m.bar}`} />
                {m.method}
              </span>
              <span>{ready ? money(cut.byMethod[m.method]) : "—"}</span>
            </div>
          ))}
        </section>
        <section className={card}>
          <h2 className="text-muted text-[15px] font-bold">Efectivo en caja</h2>
          <div className="flex justify-between">
            <span>Fondo inicial</span>
            <span>{money(shift.openingFloat)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ventas en efectivo</span>
            <span>{ready ? `+${money(cut.byMethod.Efectivo)}` : "—"}</span>
          </div>
          {shift.withdrawals.map((w, i) => (
            <div key={i} className="flex justify-between">
              <span>
                Retiro {hhmm(w.at.toDate())} · {w.reason}
              </span>
              <span>−{money(w.amount)}</span>
            </div>
          ))}
          <div className="bg-line h-px" />
          <div className="flex justify-between font-extrabold">
            <span>Esperado</span>
            <span>{ready ? money(cut.expected) : "—"}</span>
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
              min={0}
              value={countedText}
              onChange={(e) => setCountedText(e.target.value)}
              className="w-32 bg-transparent text-[26px] font-black outline-none"
            />
            {ready && hasCounted && diff !== 0 && (
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
      {closeError && (
        <p role="alert" className="text-salmon px-5 pt-3 text-[15px] font-bold">
          {closeError}
        </p>
      )}
      <div className="grid grid-cols-[1fr_1.4fr] gap-2.5 px-5 pt-4 pb-8">
        <button
          type="button"
          disabled={!ready || cut.expected <= 0}
          onClick={() => setWithdrawing(true)}
          className="border-line h-15 rounded-2xl border-[1.5px] text-[17px] font-extrabold disabled:opacity-40"
        >
          Retiro
        </button>
        <button
          type="button"
          disabled={!ready || !hasCounted || closing}
          onClick={close}
          className="bg-chili h-15 rounded-2xl text-lg font-black disabled:opacity-40"
        >
          {closing ? "Cerrando…" : "Cerrar turno"}
        </button>
      </div>
      {withdrawing && ready && (
        <WithdrawalSheet
          available={cut.expected}
          onClose={() => setWithdrawing(false)}
          onConfirm={async (amount, reason) => {
            onWithdrawal(await addWithdrawal(shift.id, amount, reason));
            setWithdrawing(false);
          }}
        />
      )}
    </Screen>
  );
};
