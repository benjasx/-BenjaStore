import { useState } from "react";
import { BottomNav, type NavTab } from "@/components/BottomNav";
import { ErrorBanner, ProductsSkeleton } from "@/components/ProductsState";
import { Header, Screen } from "@/components/Screen";
import { PeriodPicker } from "@/components/PeriodPicker";
import { parseInputDate, toInputDate } from "@/lib/periodInput";
import { money } from "@/data/mock";
import { useSalesRange } from "@/hooks/useSalesRange";
import { downloadReportPdf, PDF_TITLES, type PdfKind } from "@/lib/reportPdf";
import {
  buildReport,
  compare,
  getPeriodRanges,
  shortDate,
  type Period,
} from "@/lib/reports";

const pdfKinds: readonly PdfKind[] = [
  "top-items",
  "hours",
  "tickets",
  "general",
];

const card = "flex flex-col gap-3 rounded-[18px] bg-surface p-[18px]";

const salesTitle = (period: Period, now: Date, from?: Date, to?: Date) => {
  switch (period) {
    case "Hoy":
      return `${now.toLocaleDateString("es-MX", { weekday: "long" })} ${shortDate(now)}`;
    case "Semana":
      return `semana del ${shortDate(getPeriodRanges("Semana", now)!.current.start)}`;
    case "Mes":
      return now.toLocaleDateString("es-MX", { month: "long" });
    case "Rango":
      return from && to ? `${shortDate(from)} – ${shortDate(to)}` : "rango";
  }
};

const comparisonLabel = (period: Period, now: Date) => {
  switch (period) {
    case "Hoy":
      return `${now.toLocaleDateString("es-MX", { weekday: "long" })} pasado`;
    case "Semana":
      return "semana anterior";
    case "Mes":
      return "mes anterior";
    case "Rango":
      return "periodo anterior";
  }
};

export const ReportsScreen = ({
  onNavigate,
}: {
  onNavigate: (tab: NavTab) => void;
}) => {
  const [period, setPeriod] = useState<Period>("Hoy");
  const now = new Date();
  const [from, setFrom] = useState(() => toInputDate(now));
  const [to, setTo] = useState(() => toInputDate(now));

  const fromDate = parseInputDate(from);
  const toDate = parseInputDate(to);
  const ranges =
    period === "Rango"
      ? fromDate && toDate
        ? getPeriodRanges("Rango", now, { from: fromDate, to: toDate })
        : null
      : getPeriodRanges(period, now);

  const current = useSalesRange(ranges?.current ?? null, period === "Hoy");
  const previous = useSalesRange(ranges?.previous ?? null, false);

  const report = ranges
    ? buildReport(current.sales, ranges.current, period)
    : null;
  const comparison = report ? compare(report.total, previous.sales) : null;
  const loading = current.loading || previous.loading;
  const error = current.error ?? previous.error;
  const retry = () => {
    current.retry();
    previous.retry();
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);
  const canExport = !!ranges && !loading && !generating;

  const exportPdf = async (kind: PdfKind) => {
    if (!ranges) return;
    setMenuOpen(false);
    setGenerating(true);
    setPdfFailed(false);
    try {
      await downloadReportPdf(
        kind,
        current.sales,
        ranges.current,
        salesTitle(period, now, fromDate ?? undefined, toDate ?? undefined),
      );
    } catch (error) {
      console.error(error);
      setPdfFailed(true);
    } finally {
      setGenerating(false);
    }
  };

  const maxBucket = Math.max(0, ...(report?.buckets.map((b) => b.total) ?? []));
  const peak = report?.buckets.find((b) => b.peak);
  const labelEvery = Math.ceil((report?.buckets.length ?? 0) / 12) || 1;
  const hasSales = (report?.tickets ?? 0) > 0;

  return (
    <Screen>
      <div className="flex flex-col gap-3.5 pb-3.5">
        <Header
          title="Reportes"
          action={
            <div className="relative mr-5">
              <button
                type="button"
                disabled={!canExport}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="bg-gold text-ink h-11 rounded-xl px-4 text-base font-extrabold disabled:opacity-40"
              >
                {generating ? "Generando…" : "PDF"}
              </button>
              {menuOpen && canExport && (
                <div
                  role="menu"
                  className="bg-surface-2 border-line absolute top-full right-0 z-10 mt-2 flex w-56 flex-col overflow-hidden rounded-[14px] border-[1.5px]"
                >
                  {pdfKinds.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      role="menuitem"
                      onClick={() => exportPdf(kind)}
                      className="h-12 px-4 text-left text-base font-bold"
                    >
                      {PDF_TITLES[kind]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          }
        />
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
      {pdfFailed && (
        <p
          role="alert"
          className="text-salmon px-5 pb-3.5 text-[15px] font-bold"
        >
          No se pudo generar el PDF. Inténtalo de nuevo.
        </p>
      )}
      {error && (
        <ErrorBanner
          onRetry={retry}
          message="No se pudieron cargar las ventas."
        />
      )}
      <div className="flex flex-1 flex-col gap-3.5 px-5 pb-6 lg:grid lg:flex-none lg:grid-cols-2 lg:items-start xl:grid-cols-3">
        {loading && <ProductsSkeleton rows={2} />}
        {!loading && report && (
          <>
            <section className={`${card} gap-3.5`}>
              <div className="flex flex-col gap-0.5">
                <p className="text-muted text-[15px] font-semibold">
                  Ventas ·{" "}
                  {salesTitle(
                    period,
                    now,
                    fromDate ?? undefined,
                    toDate ?? undefined,
                  )}
                </p>
                <p className="font-marker text-gold text-5xl leading-[1.1]">
                  {money(report.total)}
                </p>
                {comparison?.changePct != null && (
                  <p
                    className={`text-[15px] font-bold ${
                      comparison.changePct < 0 ? "text-salmon" : "text-ok"
                    }`}
                  >
                    {comparison.changePct < 0
                      ? `−${-comparison.changePct}%`
                      : `+${comparison.changePct}%`}{" "}
                    vs. {comparisonLabel(period, now)} (
                    {money(comparison.previousTotal)})
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ["Tickets", String(report.tickets)],
                  ["Ticket promedio", money(report.average)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-ink rounded-xl p-3">
                    <p className="text-muted text-sm">{label}</p>
                    <p className="text-2xl font-black">{value}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className={`${card} gap-3.5`}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-[17px] font-extrabold">
                  {report.bucketUnit === "hour"
                    ? "Ventas por hora"
                    : "Ventas por día"}
                </h2>
                {peak && (
                  <span className="text-muted text-sm">Pico {peak.title}</span>
                )}
              </div>
              {hasSales ? (
                <>
                  <div
                    className="grid h-30 items-end gap-1.5"
                    style={{
                      gridTemplateColumns: `repeat(${report.buckets.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {report.buckets.map((b) => (
                      <div
                        key={b.title}
                        title={`${b.title} · ${money(b.total)}`}
                        style={{
                          height: `${maxBucket ? Math.max((b.total / maxBucket) * 100, 4) : 4}%`,
                        }}
                        className={`rounded ${b.peak ? "bg-gold" : "bg-surface-3"}`}
                      />
                    ))}
                  </div>
                  <div
                    className="text-muted grid gap-1.5 text-center font-mono text-xs"
                    style={{
                      gridTemplateColumns: `repeat(${report.buckets.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {report.buckets.map((b, i) => (
                      <span key={b.title} className={b.peak ? "text-gold" : ""}>
                        {i % labelEvery === 0 ? b.label : ""}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted text-[15px]">
                  Sin ventas en este periodo.
                </p>
              )}
            </section>
            <section className={card}>
              <h2 className="text-[17px] font-extrabold">Más vendidos</h2>
              {report.topItems.length === 0 && (
                <p className="text-muted text-[15px]">Sin ventas todavía.</p>
              )}
              {report.topItems.map((p) => (
                <div key={p.key} className="flex flex-col gap-[5px]">
                  <div className="flex justify-between gap-3 text-base">
                    <span>{p.name}</span>
                    <span className="font-extrabold">{p.qty}</span>
                  </div>
                  <div className="bg-ink h-2 rounded">
                    <div
                      className="bg-chili h-full rounded"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </section>
            <section className={card}>
              <h2 className="text-[17px] font-extrabold">Salsas más pedidas</h2>
              {report.sauces.length === 0 && (
                <p className="text-muted text-[15px]">Sin salsas todavía.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {report.sauces.map((s, i) => (
                  <span
                    key={s.name}
                    className={`flex h-10 items-center rounded-full px-3.5 text-[15px] uppercase ${
                      i === 0
                        ? "bg-gold text-ink font-extrabold"
                        : "bg-surface-3 font-bold"
                    }`}
                  >
                    {s.name} {s.pct}%
                  </span>
                ))}
              </div>
            </section>
            <section className={`${card} tabular-nums`}>
              <h2 className="text-[17px] font-extrabold">Por canal</h2>
              {report.channels.map((c) => (
                <div
                  key={c.channel}
                  className="flex justify-between gap-3 text-base"
                >
                  <span>{c.channel}</span>
                  <span>
                    {money(c.total)} · {c.tickets}
                  </span>
                </div>
              ))}
            </section>
            <div className="border-line flex h-14 items-center justify-between rounded-[14px] border-[1.5px] px-[18px] text-base font-bold">
              <span>Descuentos</span>
              <span className="text-salmon tabular-nums">
                {report.discounts.tickets} · −{money(report.discounts.amount)}
              </span>
            </div>
          </>
        )}
      </div>
      <BottomNav active="reports" onChange={onNavigate} />
    </Screen>
  );
};
