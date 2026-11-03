import { useState } from "react";
import { PeriodPicker } from "@/components/PeriodPicker";
import { ErrorBanner, ProductsSkeleton } from "@/components/ProductsState";
import { Header, Screen } from "@/components/Screen";
import { money } from "@/data/mock";
import { useShiftsRange } from "@/hooks/useShiftsRange";
import { parseInputDate, toInputDate } from "@/lib/periodInput";
import { downloadCutsPdf, downloadCutsXlsx } from "@/lib/cutsExport";
import { getPeriodRanges, type Period } from "@/lib/reports";
import { exportPeriodLabel } from "@/lib/salesExport";
import {
  filterShifts,
  isOpenShift,
  sellersOf,
  summarize,
  summarizeBySeller,
} from "@/lib/shiftHistory";
import { ShiftDetailSheet } from "@/components/ShiftDetailSheet";
import { Toggle } from "@/components/Toggle";
import type { Shift } from "@/lib/shifts";

interface Props {
  onBack: () => void;
}

const hhmm = (d: Date) =>
  d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const day = (d: Date) =>
  d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

const signed = (n: number) => (n < 0 ? `−${money(-n)}` : money(n));

const Chip = ({ shift }: { shift: Shift }) => {
  const base = "rounded-full px-3 py-1 text-sm font-extrabold tabular-nums";
  if (isOpenShift(shift) || !shift.cut)
    return <span className={`${base} bg-line text-muted`}>Abierto</span>;
  const { difference } = shift.cut;
  if (difference < 0)
    return (
      <span className={`${base} text-salmon bg-line`}>
        Faltan {money(-difference)}
      </span>
    );
  if (difference > 0)
    return (
      <span className={`${base} text-gold bg-line`}>
        Sobran {money(difference)}
      </span>
    );
  return <span className={`${base} text-ok bg-line`}>Cuadra</span>;
};

const ShiftRow = ({ shift, onOpen }: { shift: Shift; onOpen: () => void }) => {
  const opened = shift.openedAt.toDate();
  const closed = shift.closedAt?.toDate();
  return (
    <button
      type="button"
      aria-label={`Ver turno de ${shift.seller.name}`}
      onClick={onOpen}
      className="bg-surface flex flex-col gap-1.5 rounded-[18px] p-4 text-left"
    >
      <div className="flex items-center justify-between gap-3 text-lg">
        <span className="font-black uppercase">{shift.seller.name}</span>
        <Chip shift={shift} />
      </div>
      <p className="text-muted text-[15px]">
        {day(opened)} · {hhmm(opened)} – {closed ? hhmm(closed) : "abierto"}
      </p>
      <p className="text-[15px] tabular-nums">
        {shift.cut
          ? `Esperado ${money(shift.cut.expected)} · Contado ${money(shift.cut.counted)}`
          : `Fondo ${money(shift.openingFloat)}`}
      </p>
    </button>
  );
};

export const CutsScreen = ({ onBack }: Props) => {
  const [period, setPeriod] = useState<Period>("Hoy");
  const now = new Date();
  const [from, setFrom] = useState(() => toInputDate(now));
  const [to, setTo] = useState(() => toInputDate(now));
  const [sellerPick, setSellerPick] = useState<string | null>(null);
  const [onlyDifference, setOnlyDifference] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [exportFailed, setExportFailed] = useState(false);

  const fromDate = parseInputDate(from);
  const toDate = parseInputDate(to);
  const ranges =
    period === "Rango"
      ? fromDate && toDate
        ? getPeriodRanges("Rango", now, { from: fromDate, to: toDate })
        : null
      : getPeriodRanges(period, now);

  const { shifts, loading, error, retry } = useShiftsRange(
    ranges?.current ?? null,
    period === "Hoy",
  );

  const sellers = sellersOf(shifts);
  const sellerId = sellers.some((s) => s.id === sellerPick) ? sellerPick : null;
  const visible = filterShifts(shifts, { sellerId, onlyDifference, onlyOpen });
  // El resumen del periodo respeta vendedor y ignora los interruptores; el de
  // vendedores ignora el filtro de vendedor para poder compararlos.
  const totals = summarize(
    shifts.filter((s) => !sellerId || s.seller.id === sellerId),
  );
  const bySeller = summarizeBySeller(shifts);
  const detail = shifts.find((s) => s.id === openedId) ?? null;

  const canExport =
    !!ranges && !loading && !error && visible.length > 0 && !exporting;

  const exportCuts = async (kind: "pdf" | "xlsx") => {
    if (!ranges) return;
    setExporting(kind);
    setExportFailed(false);
    try {
      const data = { shifts: visible, totals, bySeller };
      if (kind === "pdf") {
        await downloadCutsPdf(data, exportPeriodLabel(ranges.current));
      } else {
        await downloadCutsXlsx(data);
      }
    } catch (e) {
      console.error(e);
      setExportFailed(true);
    } finally {
      setExporting(null);
    }
  };

  return (
    <Screen className="lg:max-w-160">
      <div className="flex flex-col gap-3.5 pb-3.5">
        <Header
          title="Historial de cortes"
          onBack={onBack}
          action={
            <div className="mr-5 flex gap-2">
              {(
                [
                  ["xlsx", "Excel"],
                  ["pdf", "PDF"],
                ] as const
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  disabled={!canExport}
                  onClick={() => exportCuts(kind)}
                  className="bg-gold text-ink h-11 rounded-xl px-4 text-base font-extrabold disabled:opacity-40"
                >
                  {exporting === kind ? "Generando…" : label}
                </button>
              ))}
            </div>
          }
        />
        {exportFailed && (
          <p role="alert" className="text-salmon px-5 text-[15px] font-bold">
            No se pudo generar el archivo. Inténtalo de nuevo.
          </p>
        )}
        <PeriodPicker
          period={period}
          onPeriod={setPeriod}
          from={from}
          to={to}
          onFrom={setFrom}
          onTo={setTo}
          invalid={!ranges}
        />
      </div>
      {error && (
        <ErrorBanner
          onRetry={retry}
          message="No se pudieron cargar los cortes."
        />
      )}
      <div className="flex flex-1 flex-col gap-3.5 px-5 pb-6">
        {loading && <ProductsSkeleton rows={4} />}
        {!loading && !error && ranges && shifts.length > 0 && (
          <div className="flex flex-col gap-3">
            <select
              aria-label="Vendedor"
              value={sellerId ?? ""}
              onChange={(e) => setSellerPick(e.target.value || null)}
              className="bg-surface border-line focus:border-gold h-12 rounded-[14px] border-[1.5px] px-3.5 text-base outline-none"
            >
              <option value="">Todos los vendedores</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {(
              [
                ["Solo con diferencia", onlyDifference, setOnlyDifference],
                ["Solo abiertos", onlyOpen, setOnlyOpen],
              ] as const
            ).map(([label, checked, set]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 text-base font-semibold"
              >
                {label}
                <Toggle checked={checked} onChange={set} label={label} />
              </div>
            ))}
          </div>
        )}
        {!loading && !error && ranges && shifts.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {(
                [
                  ["Faltante", money(totals.shortage), "text-salmon"],
                  ["Sobrante", money(totals.surplus), "text-gold"],
                  ["Neto", signed(totals.net), ""],
                  ["Con diferencia", String(totals.withDifference), ""],
                ] as const
              ).map(([label, value, tone]) => (
                <div
                  key={label}
                  className="bg-surface rounded-[18px] p-3.5 text-center"
                >
                  <p className="text-muted text-sm">{label}</p>
                  <p className={`text-xl font-black tabular-nums ${tone}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <section
              aria-label="Por vendedor"
              className="bg-surface flex flex-col gap-2.5 rounded-[18px] p-4"
            >
              <h2 className="text-muted text-sm font-semibold">Por vendedor</h2>
              {bySeller.map((s) => (
                <div
                  key={s.seller.id}
                  className="border-line-soft flex flex-col gap-0.5 border-t pt-2.5 first-of-type:border-t-0 first-of-type:pt-0"
                >
                  <div className="flex justify-between gap-3 text-base">
                    <span className="font-black uppercase">
                      {s.seller.name}
                    </span>
                    <span className="font-extrabold tabular-nums">
                      {signed(s.net)}
                    </span>
                  </div>
                  <p className="text-muted text-[15px] tabular-nums">
                    {s.closed} turnos · {s.withDifference} con diferencia ·
                    faltan {money(s.shortage)} · sobran {money(s.surplus)}
                  </p>
                </div>
              ))}
            </section>
          </>
        )}
        {!loading && !error && ranges && shifts.length === 0 && (
          <p className="text-muted text-[15px]">Sin turnos en este periodo.</p>
        )}
        {!loading &&
          !error &&
          ranges &&
          shifts.length > 0 &&
          visible.length === 0 && (
            <p className="text-muted text-[15px]">
              Ningún turno coincide con los filtros.
            </p>
          )}
        {!loading &&
          !error &&
          ranges &&
          visible.map((shift) => (
            <ShiftRow
              key={shift.id}
              shift={shift}
              onOpen={() => setOpenedId(shift.id)}
            />
          ))}
      </div>
      {detail && (
        <ShiftDetailSheet shift={detail} onClose={() => setOpenedId(null)} />
      )}
    </Screen>
  );
};
