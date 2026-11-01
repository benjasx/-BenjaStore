import { useState } from "react";
import { BottomNav, type NavTab } from "@/components/BottomNav";
import { CancelSaleSheet } from "@/components/CancelSaleSheet";
import { PeriodPicker } from "@/components/PeriodPicker";
import { parseInputDate, toInputDate } from "@/lib/periodInput";
import { ErrorBanner, ProductsSkeleton } from "@/components/ProductsState";
import { Header, Screen } from "@/components/Screen";
import { TicketSheet } from "@/components/TicketSheet";
import { money } from "@/data/mock";
import type { AppUser } from "@/lib/users";
import { useRole } from "@/hooks/useRole";
import { can } from "@/lib/permissions";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useSalesList } from "@/hooks/useSalesList";
import { getPeriodRanges, type Period } from "@/lib/reports";
import { cancelSale, formatFolio, isCancelled, type Sale } from "@/lib/sales";
import {
  downloadSalesPdf,
  downloadSalesXlsx,
  exportPeriodLabel,
} from "@/lib/salesExport";
import { paginate } from "@/lib/salesList";

const formatDate = (sale: Sale) =>
  sale.createdAt.toDate().toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const pageButton =
  "border-line h-11 rounded-xl border-[1.5px] px-4 text-base font-bold disabled:opacity-40";

const headers = [
  "Folio",
  "Fecha y hora",
  "Vendedor",
  "Canal",
  "Pago",
  "Total",
  "Estado",
];

const Status = ({ sale }: { sale: Sale }) =>
  isCancelled(sale) ? (
    <span className="text-salmon font-extrabold">Cancelada</span>
  ) : (
    <span className="text-ok font-extrabold">Activa</span>
  );

const Total = ({ sale }: { sale: Sale }) => (
  <span
    className={`tabular-nums ${isCancelled(sale) ? "text-muted line-through" : "font-extrabold"}`}
  >
    {money(sale.total)}
  </span>
);

export const SalesScreen = ({
  seller,
  onNavigate,
}: {
  seller: Pick<AppUser, "id" | "name" | "initials"> | null;
  onNavigate: (tab: NavTab) => void;
}) => {
  const desktop = useIsDesktop();
  const [period, setPeriodState] = useState<Period>("Hoy");
  const now = new Date();
  const [from, setFromState] = useState(() => toInputDate(now));
  const [to, setToState] = useState(() => toInputDate(now));
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState<Sale | null>(null);
  const [cancelling, setCancelling] = useState(false);
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

  const role = useRole();
  const list = useSalesList(ranges?.current ?? null, period === "Hoy");
  const { loading, error, retry } = list;
  const sales = can(role, "viewAllSales")
    ? list.sales
    : list.sales.filter((s) => s.seller?.id === seller?.id);

  const active = sales.filter((s) => !isCancelled(s));
  const total = active.reduce((sum, s) => sum + s.total, 0);
  const pageData = paginate(sales, page);

  const shown = opened
    ? (sales.find((s) => s.id === opened.id) ?? opened)
    : null;

  const confirmCancel = async (reason: string) => {
    if (!shown) return;
    await cancelSale(
      shown.id,
      reason,
      seller ? { id: seller.id, name: seller.name } : undefined,
    );
    setCancelling(false);
    setOpened(null);
    retry();
  };

  const canExport =
    !!ranges && !loading && !error && sales.length > 0 && !exporting;

  const exportSales = async (kind: "pdf" | "xlsx") => {
    if (!ranges) return;
    setExporting(kind);
    setExportFailed(false);
    try {
      if (kind === "pdf") {
        await downloadSalesPdf(sales, exportPeriodLabel(ranges.current));
      } else {
        await downloadSalesXlsx(sales);
      }
    } catch (e) {
      console.error(e);
      setExportFailed(true);
    } finally {
      setExporting(null);
    }
  };

  const setPeriod = (value: Period) => {
    setPeriodState(value);
    setPage(1);
  };
  const setFrom = (value: string) => {
    setFromState(value);
    setPage(1);
  };
  const setTo = (value: string) => {
    setToState(value);
    setPage(1);
  };

  return (
    <Screen>
      <div className="flex flex-col gap-3.5 pb-3.5">
        <Header
          title="Ventas"
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
                  onClick={() => exportSales(kind)}
                  className="bg-gold text-ink h-11 rounded-xl px-4 text-base font-extrabold disabled:opacity-40"
                >
                  {exporting === kind ? "Generando…" : label}
                </button>
              ))}
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
      {exportFailed && (
        <p
          role="alert"
          className="text-salmon px-5 pb-3.5 text-[15px] font-bold"
        >
          No se pudo generar el archivo. Inténtalo de nuevo.
        </p>
      )}
      {error && (
        <ErrorBanner
          onRetry={retry}
          message="No se pudieron cargar las ventas."
        />
      )}
      <div className="flex flex-1 flex-col gap-3.5 px-5 pb-6">
        {loading && <ProductsSkeleton rows={4} />}
        {!loading && !error && ranges && (
          <>
            <div className="bg-surface grid grid-cols-3 gap-2.5 rounded-[18px] p-3.5 text-center">
              {[
                ["Ventas", String(active.length)],
                ["Canceladas", String(sales.length - active.length)],
                ["Total vendido", money(total)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-muted text-sm">{label}</p>
                  <p className="text-xl font-black tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            {sales.length === 0 ? (
              <p className="text-muted text-[15px]">
                Sin ventas en este periodo.
              </p>
            ) : desktop ? (
              <table className="w-full text-left text-base">
                <thead className="text-muted text-sm">
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.items.map((sale) => (
                    <tr
                      key={sale.id}
                      onClick={() => setOpened(sale)}
                      className="border-line-soft hover:bg-surface cursor-pointer border-t"
                    >
                      <td className="px-3 py-3 font-extrabold">
                        <button
                          type="button"
                          aria-label={`Ver ticket ${formatFolio(sale.folio)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpened(sale);
                          }}
                        >
                          #{formatFolio(sale.folio)}
                        </button>
                      </td>
                      <td className="px-3 py-3">{formatDate(sale)}</td>
                      <td className="px-3 py-3 uppercase">
                        {sale.seller?.name ?? "—"}
                      </td>
                      <td className="px-3 py-3 uppercase">{sale.channel}</td>
                      <td className="px-3 py-3">{sale.paymentMethod}</td>
                      <td className="px-3 py-3">
                        <Total sale={sale} />
                      </td>
                      <td className="px-3 py-3">
                        <Status sale={sale} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              pageData.items.map((sale) => (
                <button
                  key={sale.id}
                  type="button"
                  aria-label={`Ver ticket ${formatFolio(sale.folio)}`}
                  onClick={() => setOpened(sale)}
                  className="bg-surface flex flex-col gap-1.5 rounded-[18px] p-4 text-left"
                >
                  <div className="flex justify-between gap-3 text-lg">
                    <span className="font-black">
                      #{formatFolio(sale.folio)}
                    </span>
                    <Total sale={sale} />
                  </div>
                  <div className="text-muted flex justify-between gap-3 text-[15px]">
                    <span>{formatDate(sale)}</span>
                    <Status sale={sale} />
                  </div>
                  <p className="text-[15px] uppercase">
                    {sale.channel} · {sale.paymentMethod} ·{" "}
                    {sale.seller?.name ?? "—"}
                  </p>
                </button>
              ))
            )}
            {sales.length > 0 && (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={pageData.page <= 1}
                  onClick={() => setPage(pageData.page - 1)}
                  className={pageButton}
                >
                  Anterior
                </button>
                <span className="text-muted text-[15px]">
                  Página {pageData.page} de {pageData.pages}
                </span>
                <button
                  type="button"
                  disabled={pageData.page >= pageData.pages}
                  onClick={() => setPage(pageData.page + 1)}
                  className={pageButton}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {shown && (
        <TicketSheet
          sale={shown}
          onClose={() => setOpened(null)}
          onCancel={() => setCancelling(true)}
        />
      )}
      {shown && cancelling && (
        <CancelSaleSheet
          sale={shown}
          onClose={() => setCancelling(false)}
          onConfirm={confirmCancel}
        />
      )}
      <BottomNav active="sales" onChange={onNavigate} />
    </Screen>
  );
};
