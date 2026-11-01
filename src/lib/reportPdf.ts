import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { money } from "@/data/mock";
import {
  buildReport,
  hourlyBuckets,
  rankItems,
  type DateRange,
  type ReportSale,
} from "@/lib/reports";

export type PdfKind = "top-items" | "hours" | "tickets" | "general";

export interface PdfMeta {
  periodLabel: string;
  generatedAt: Date;
  logo?: string;
}

export const PDF_TITLES: Record<PdfKind, string> = {
  "top-items": "Productos más vendidos",
  hours: "Ventas por hora",
  tickets: "Total de tickets",
  general: "Reporte general",
};

const FILE_SLUGS: Record<PdfKind, string> = {
  "top-items": "productos-mas-vendidos",
  hours: "ventas-por-hora",
  tickets: "total-de-tickets",
  general: "general",
};

const LOGO_URL = "/logo_letras.jpeg";
const EMPTY = "Sin ventas en este periodo.";

const pad = (n: number) => String(n).padStart(2, "0");

export const isoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const dateTime = (date: Date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const pdfFileName = (kind: PdfKind, date: Date) =>
  `reporte-${FILE_SLUGS[kind]}-${isoDate(date)}.pdf`;

const heading = (text: string): Content => ({
  text,
  style: "section",
  margin: [0, 14, 0, 6],
});

const emptyNote = (): Content => ({ text: EMPTY, margin: [0, 16, 0, 0] });

const table = (
  head: string[],
  rows: Content[][],
  widths: (string | number)[],
  alignRight: number[] = [],
): Content => ({
  table: {
    headerRows: 1,
    widths,
    body: [
      head.map((text, i) => ({
        text,
        bold: true,
        alignment: alignRight.includes(i) ? "right" : "left",
      })),
      ...rows.map((row) =>
        row.map((cell, i) =>
          typeof cell === "string"
            ? {
                text: cell,
                alignment: alignRight.includes(i) ? "right" : "left",
              }
            : cell,
        ),
      ),
    ] as Content[][],
  },
  layout: "lightHorizontalLines",
});

const topItemsContent = (sales: ReportSale[], range: DateRange): Content[] => {
  const items = rankItems(sales, range);
  if (items.length === 0) return [emptyNote()];
  return [
    table(
      ["#", "Producto", "Cantidad"],
      items.map((item, i) => [String(i + 1), item.name, String(item.qty)]),
      [24, "*", 70],
      [2],
    ),
  ];
};

const hoursContent = (sales: ReportSale[], range: DateRange): Content[] => {
  const hours = hourlyBuckets(sales, range);
  if (hours.length === 0) return [emptyNote()];
  const total = hours.reduce((sum, h) => sum + h.total, 0);
  const tickets = hours.reduce((sum, h) => sum + h.tickets, 0);
  return [
    table(
      ["Hora", "Tickets", "Total"],
      [
        ...hours.map((h) => [
          `${pad(h.hour)}:00 – ${pad(h.hour)}:59`,
          String(h.tickets),
          money(h.total),
        ]),
        [
          { text: "Total", bold: true },
          { text: String(tickets), bold: true, alignment: "right" as const },
          { text: money(total), bold: true, alignment: "right" as const },
        ],
      ],
      ["*", 70, 90],
      [1, 2],
    ),
  ];
};

const ticketsContent = (sales: ReportSale[], range: DateRange): Content[] => {
  const report = buildReport(sales, range, "Hoy");
  if (report.tickets === 0) return [emptyNote()];

  const methods = new Map<string, { tickets: number; total: number }>();
  for (const sale of sales.filter(
    (s) => s.createdAt >= range.start && s.createdAt < range.end,
  )) {
    const key = sale.paymentMethod ?? "Sin dato";
    const entry = methods.get(key) ?? { tickets: 0, total: 0 };
    entry.tickets += 1;
    entry.total += sale.total;
    methods.set(key, entry);
  }

  return [
    table(
      ["Concepto", "Valor"],
      [
        ["Total de tickets", String(report.tickets)],
        ["Total vendido", money(report.total)],
        ["Ticket promedio", money(report.average)],
      ],
      ["*", 120],
      [1],
    ),
    heading("Por canal"),
    table(
      ["Canal", "Tickets", "Total"],
      report.channels.map((c) => [
        c.channel,
        String(c.tickets),
        money(c.total),
      ]),
      ["*", 70, 90],
      [1, 2],
    ),
    heading("Por método de pago"),
    table(
      ["Método", "Tickets", "Total"],
      [...methods.entries()].map(([method, v]) => [
        method,
        String(v.tickets),
        money(v.total),
      ]),
      ["*", 70, 90],
      [1, 2],
    ),
  ];
};

const generalContent = (sales: ReportSale[], range: DateRange): Content[] => {
  const inRange = sales
    .filter((s) => s.createdAt >= range.start && s.createdAt < range.end)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (inRange.length === 0) return [emptyNote()];

  const blocks = inRange.flatMap((sale): Content[] => {
    const title = [
      sale.folio !== undefined
        ? `Ticket #${String(sale.folio).padStart(4, "0")}`
        : "Ticket",
      dateTime(sale.createdAt),
      sale.seller ? `Vendedor: ${sale.seller.name}` : "Sin vendedor",
      sale.channel,
      sale.paymentMethod ?? "",
    ]
      .filter(Boolean)
      .join(" · ");

    const rows: Content[][] = sale.lines.map((line) => {
      const details = [
        line.contents,
        line.sauces?.included.length
          ? `Salsa: ${line.sauces.included.join(", ")}`
          : undefined,
        line.sauces?.extra.length
          ? `Extra: ${line.sauces.extra.map((e) => e.name).join(", ")} (+${money(line.extras)})`
          : undefined,
        line.saving > 0
          ? `${line.promotionName ?? "Descuento"} −${money(line.saving)}`
          : undefined,
      ].filter((d): d is string => !!d);
      return [
        String(line.qty),
        {
          stack: [
            { text: line.name, bold: true },
            ...details.map((text) => ({ text, fontSize: 8, color: "#555555" })),
          ],
        },
        money(line.gross - line.saving + line.extras),
      ];
    });

    return [
      { text: title, bold: true, margin: [0, 12, 0, 4] },
      table(["Cant.", "Producto", "Importe"], rows, [34, "*", 70], [2]),
      ...(sale.saleSaving > 0
        ? [
            {
              text: `Descuento de venta −${money(sale.saleSaving)}`,
              alignment: "right" as const,
              margin: [0, 4, 0, 0] as [number, number, number, number],
            },
          ]
        : []),
      {
        text: `Total del ticket: ${money(sale.total)}`,
        bold: true,
        alignment: "right",
        margin: [0, 4, 0, 0],
      },
    ];
  });

  const total = inRange.reduce((sum, s) => sum + s.total, 0);
  return [
    ...blocks,
    {
      text: `Total general: ${money(total)} · ${inRange.length} ${inRange.length === 1 ? "ticket" : "tickets"}`,
      style: "section",
      alignment: "right",
      margin: [0, 18, 0, 0],
    },
  ];
};

const bodies: Record<
  PdfKind,
  (sales: ReportSale[], range: DateRange) => Content[]
> = {
  "top-items": topItemsContent,
  hours: hoursContent,
  tickets: ticketsContent,
  general: generalContent,
};

export const buildPdfDefinition = (
  kind: PdfKind,
  sales: ReportSale[],
  range: DateRange,
  meta: PdfMeta,
): TDocumentDefinitions => ({
  info: { title: `${PDF_TITLES[kind]} · ${meta.periodLabel}` },
  pageSize: "A4",
  pageMargins: [40, 40, 40, 50],
  defaultStyle: { fontSize: 10 },
  styles: {
    title: { fontSize: 18, bold: true },
    section: { fontSize: 12, bold: true },
  },
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
            { text: PDF_TITLES[kind], style: "title", alignment: "center" },
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
    ...bodies[kind](sales, range),
  ],
  footer: (currentPage: number, pageCount: number) => ({
    text: `Página ${currentPage} de ${pageCount}`,
    alignment: "center",
    fontSize: 8,
    margin: [0, 18, 0, 0],
  }),
});

export const loadLogo = async (): Promise<string | undefined> => {
  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
};

type PdfMakeApi = Pick<
  typeof import("pdfmake/build/pdfmake"),
  "createPdf" | "addVirtualFileSystem"
>;

export const loadPdfMake = async () => {
  const [pdfModule, fontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const pdfMake = ((pdfModule as { default?: PdfMakeApi }).default ??
    pdfModule) as PdfMakeApi;
  const vfs = (fontsModule as { default?: object }).default ?? fontsModule;
  pdfMake.addVirtualFileSystem(
    vfs as Parameters<PdfMakeApi["addVirtualFileSystem"]>[0],
  );
  return pdfMake;
};

export const downloadReportPdf = async (
  kind: PdfKind,
  sales: ReportSale[],
  range: DateRange,
  periodLabel: string,
) => {
  const [logo, pdfMake] = await Promise.all([loadLogo(), loadPdfMake()]);

  const now = new Date();
  await pdfMake
    .createPdf(
      buildPdfDefinition(kind, sales, range, {
        periodLabel,
        generatedAt: now,
        logo,
      }),
    )
    .download(pdfFileName(kind, now));
};
