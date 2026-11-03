import { money } from "@/data/mock";
import type { PaymentMethod } from "@/lib/sales";
import type { Shift } from "@/lib/shifts";

interface Props {
  shift: Shift;
  onClose: () => void;
}

const methods: PaymentMethod[] = ["Efectivo", "Tarjeta", "Transfer."];

const hhmm = (d: Date) =>
  d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3 text-base tabular-nums">
    <span className="text-muted">{label}</span>
    <span className="font-extrabold">{value}</span>
  </div>
);

export const ShiftDetailSheet = ({ shift, onClose }: Props) => {
  const { cut } = shift;
  const opened = shift.openedAt.toDate();
  const closed = shift.closedAt?.toDate();
  const diff = cut?.difference ?? 0;

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-end lg:justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(8,5,4,0.72)]"
      />
      <div
        role="dialog"
        aria-label="Detalle del turno"
        className="bg-surface relative flex max-h-[90dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[28px] px-5 pt-5 pb-8 lg:rounded-[28px]"
      >
        <div>
          <h2 className="text-[22px] font-black uppercase">
            {shift.seller.name}
          </h2>
          <p className="text-muted text-[15px]">
            {opened.toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "short",
            })}{" "}
            · {hhmm(opened)} – {closed ? hhmm(closed) : "abierto"}
          </p>
        </div>
        <Row label="Fondo inicial" value={money(shift.openingFloat)} />
        {cut && (
          <>
            <div className="border-line-soft flex flex-col gap-2 border-t pt-3">
              <Row label="Tickets" value={String(cut.tickets)} />
              {methods.map((m) => (
                <Row key={m} label={m} value={money(cut.byMethod[m])} />
              ))}
              <Row label="Ventas totales" value={money(cut.total)} />
            </div>
          </>
        )}
        <div className="border-line-soft flex flex-col gap-2 border-t pt-3">
          <h3 className="text-muted text-sm font-semibold">Retiros</h3>
          {shift.withdrawals.length === 0 ? (
            <p className="text-muted text-[15px]">Sin retiros.</p>
          ) : (
            shift.withdrawals.map((w, i) => (
              <div
                key={i}
                className="flex justify-between gap-3 text-base tabular-nums"
              >
                <span>
                  {hhmm(w.at.toDate())} · {w.reason}
                </span>
                <span className="font-extrabold">−{money(w.amount)}</span>
              </div>
            ))
          )}
        </div>
        {cut && (
          <div className="border-line-soft flex flex-col gap-2 border-t pt-3">
            <Row label="Esperado" value={money(cut.expected)} />
            <Row label="Contado" value={money(cut.counted)} />
            <p
              className={`text-lg font-black tabular-nums ${diff < 0 ? "text-salmon" : diff > 0 ? "text-gold" : "text-ok"}`}
            >
              {diff < 0
                ? `Faltan ${money(-diff)}`
                : diff > 0
                  ? `Sobran ${money(diff)}`
                  : "Cuadra"}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="bg-surface-2 h-14 rounded-2xl text-lg font-bold"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
