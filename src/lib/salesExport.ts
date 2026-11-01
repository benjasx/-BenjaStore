import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { money } from "@/data/mock";
import { dateTime, isoDate, loadLogo, loadPdfMake } from "@/lib/reportPdf";
import { shortDate, type DateRange } from "@/lib/reports";
import { formatFolio, isCancelled, type Sale } from "@/lib/sales";

export const EXPORT_HEAD = [
  "Folio",
  "Fecha y hora",
  "Vendedor",
  "Canal",
  "Pago",
  "Total",
  "Estado",
  "Motivo de cancelación",
] as const;

export interface ExportRow {
  folio: string;
  date: Date;
  seller: string;
  channel: string;
  payment: string;
  total: number;
  status: "Activa" | "Cancelada";
  reason: string;
}

export interface ExportSummary {
  active: number;
  cancelled: number;
  total: number; // solo ventas activas
}

export const buildExportRows = (sales: Sale[]): ExportRow[] =>
  sales.map((sale) => ({
    folio: formatFolio(sale.folio),
    date: sale.createdAt.toDate(),
    seller: sale.seller?.name ?? "—",
    channel: sale.channel,
    payment: sale.paymentMethod,
    total: sale.total,
    status: isCancelled(sale) ? "Cancelada" : "Activa",
    reason: sale.cancelled?.reason ?? "",
  }));

export const summarize = (sales: Sale[]): ExportSummary => {
  const active = sales.filter((s) => !isCancelled(s));
  return {
    active: active.length,
    cancelled: sales.length - active.length,
    total: active.reduce((sum, s) => sum + s.total, 0),
  };
};

export const exportPeriodLabel = (range: DateRange) => {
  const last = new Date(range.end.getTime() - 1);
  const start = shortDate(range.start);
  const end = shortDate(last);
  return start === end ? start : `${start} – ${end}`;
};

export const exportFileName = (date: Date, extension: "pdf" | "xlsx") =>
  `ventas-${isoDate(date)}.${extension}`;

export const buildSalesPdfDefinition = (
  sales: Sale[],
  meta: { periodLabel: string; generatedAt: Date; logo?: string },
): TDocumentDefinitions => {
  const rows = buildExportRows(sales);
  const summary = summarize(sales);
  const body: Content =
    rows.length === 0
      ? { text: "Sin ventas en este periodo.", margin: [0, 16, 0, 0] }
      : {
          margin: [0, 12, 0, 0],
          table: {
            headerRows: 1,
            widths: [32, 66, "auto", "auto", "auto", 38, 42, "*"],
            body: [
              EXPORT_HEAD.map((text, i) => ({
                text,
                bold: true,
                alignment: i === 5 ? "right" : "left",
              })),
              ...rows.map((r) => [
                `#${r.folio}`,
                dateTime(r.date),
                r.seller,
                r.channel.toUpperCase(),
                r.payment,
                {
                  text: money(r.total),
                  alignment: "right" as const,
                  ...(r.status === "Cancelada" && {
                    decoration: "lineThrough" as const,
                  }),
                },
                r.status,
                r.reason,
              ]),
            ],
          },
          layout: "lightHorizontalLines",
        };

  return {
    info: { title: `Ventas · ${meta.periodLabel}` },
    pageSize: "A4",
    pageMargins: [30, 40, 30, 50],
    defaultStyle: { fontSize: 8 },
    ...(meta.logo && { images: { logo: meta.logo } }),
    content: [
      {
        columns: [
          ...(meta.logo
            ? [
                {
                  image: "logo",
                  width: 70,
                  margin: [0, 0, 12, 0] as [number, number, number, number],
                },
              ]
            : []),
          {
            width: "*",
            stack: [
              {
                text: "Ventas",
                fontSize: 18,
                bold: true,
                alignment: "center",
              },
              {
                text: `Periodo: ${meta.periodLabel}`,
                alignment: "center",
                margin: [0, 4, 0, 0],
              },
              {
                text: `Generado: ${dateTime(meta.generatedAt)}`,
                alignment: "center",
                color: "#555555",
              },
            ],
          },
        ],
      },
      {
        text: `Ventas: ${summary.active} · Canceladas: ${summary.cancelled} · Total vendido: ${money(summary.total)}`,
        bold: true,
        margin: [0, 14, 0, 0],
      },
      body,
    ],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Página ${currentPage} de ${pageCount}`,
      alignment: "center",
      fontSize: 8,
      margin: [0, 18, 0, 0],
    }),
  };
};

export const downloadSalesPdf = async (sales: Sale[], periodLabel: string) => {
  const [logo, pdfMake] = await Promise.all([loadLogo(), loadPdfMake()]);
  const now = new Date();
  await pdfMake
    .createPdf(
      buildSalesPdfDefinition(sales, { periodLabel, generatedAt: now, logo }),
    )
    .download(exportFileName(now, "pdf"));
};

export const downloadSalesXlsx = async (sales: Sale[]) => {
  const { Workbook } = await import("exceljs");
  const rows = buildExportRows(sales);
  const summary = summarize(sales);

  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Ventas");
  sheet.columns = [
    { header: EXPORT_HEAD[0], key: "folio", width: 10 },
    {
      header: EXPORT_HEAD[1],
      key: "date",
      width: 20,
      style: { numFmt: "dd/mm/yyyy hh:mm" },
    },
    { header: EXPORT_HEAD[2], key: "seller", width: 16 },
    { header: EXPORT_HEAD[3], key: "channel", width: 16 },
    { header: EXPORT_HEAD[4], key: "payment", width: 14 },
    {
      header: EXPORT_HEAD[5],
      key: "total",
      width: 12,
      style: { numFmt: '"$"#,##0' },
    },
    { header: EXPORT_HEAD[6], key: "status", width: 12 },
    { header: EXPORT_HEAD[7], key: "reason", width: 36 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  rows.forEach((r) => sheet.addRow(r));

  const totalRow = sheet.addRow({
    folio: "Total vendido (sin canceladas)",
    total: summary.total,
  });
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFileName(new Date(), "xlsx");
  link.click();
  URL.revokeObjectURL(url);
};
