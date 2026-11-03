import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { money } from "@/data/mock";
import { dateTime, isoDate, loadLogo, loadPdfMake } from "@/lib/reportPdf";
import { shortDate } from "@/lib/reports";
import {
  isOpenShift,
  type CutTotals,
  type SellerCutTotals,
} from "@/lib/shiftHistory";
import type { Shift } from "@/lib/shifts";

export const CUTS_EXPORT_HEAD = [
  "Vendedor",
  "Fecha",
  "Apertura",
  "Cierre",
  "Fondo inicial",
  "Tickets",
  "Efectivo",
  "Tarjeta",
  "Transfer.",
  "Retiros",
  "Esperado",
  "Contado",
  "Diferencia",
  "Estado",
] as const;

export interface CutsExportRow {
  seller: string;
  date: Date;
  opened: Date;
  closed: Date | null;
  openingFloat: number;
  tickets: number | null;
  cash: number | null;
  card: number | null;
  transfer: number | null;
  withdrawals: number;
  expected: number | null;
  counted: number | null;
  difference: number | null;
  status: "Faltan" | "Sobran" | "Cuadra" | "Abierto";
}

export const buildCutsRows = (shifts: Shift[]): CutsExportRow[] =>
  shifts.map((shift) => {
    const opened = shift.openedAt.toDate();
    const base = {
      seller: shift.seller.name,
      date: opened,
      opened,
      openingFloat: shift.openingFloat,
      withdrawals: shift.withdrawals.reduce((sum, w) => sum + w.amount, 0),
    };
    const { cut, closedAt } = shift;
    if (isOpenShift(shift) || !cut || !closedAt) {
      return {
        ...base,
        closed: null,
        tickets: null,
        cash: null,
        card: null,
        transfer: null,
        expected: null,
        counted: null,
        difference: null,
        status: "Abierto",
      };
    }
    return {
      ...base,
      closed: closedAt.toDate(),
      tickets: cut.tickets,
      cash: cut.byMethod.Efectivo,
      card: cut.byMethod.Tarjeta,
      transfer: cut.byMethod["Transfer."],
      expected: cut.expected,
      counted: cut.counted,
      difference: cut.difference,
      status:
        cut.difference < 0
          ? "Faltan"
          : cut.difference > 0
            ? "Sobran"
            : "Cuadra",
    };
  });

export const cutsFileName = (date: Date, extension: "pdf" | "xlsx") =>
  `cortes-${isoDate(date)}.${extension}`;

export interface CutsExportData {
  shifts: Shift[];
  totals: CutTotals;
  bySeller: SellerCutTotals[];
}

const signedMoney = (n: number) => (n < 0 ? `−${money(-n)}` : money(n));

const cell = (text: string, right = false, bold = false): Content => ({
  text,
  ...(right && { alignment: "right" as const }),
  ...(bold && { bold: true }),
});

export const buildCutsPdfDefinition = (
  data: CutsExportData,
  meta: { periodLabel: string; generatedAt: Date; logo?: string },
): TDocumentDefinitions => {
  const rows = buildCutsRows(data.shifts);
  const { totals } = data;
  const maybe = (n: number | null, fmt: (n: number) => string = money) =>
    n === null ? "" : fmt(n);
  const time = (d: Date | null) => (d ? dateTime(d) : "");

  const shiftsTable: Content =
    rows.length === 0
      ? { text: "Sin turnos en este periodo.", margin: [0, 16, 0, 0] }
      : {
          margin: [0, 6, 0, 0],
          table: {
            headerRows: 1,
            widths: [
              "*",
              "auto",
              "auto",
              "auto",
              "auto",
              "auto",
              "auto",
              "auto",
              "auto",
              "auto",
              "auto",
              "auto",
              "auto",
              "auto",
            ],
            body: [
              CUTS_EXPORT_HEAD.map((h, i) => cell(h, i >= 4 && i <= 12, true)),
              ...rows.map((r) => [
                cell(r.seller),
                cell(shortDate(r.date)),
                cell(dateTime(r.opened).slice(-5)),
                cell(time(r.closed).slice(-5)),
                cell(money(r.openingFloat), true),
                cell(maybe(r.tickets, String), true),
                cell(maybe(r.cash), true),
                cell(maybe(r.card), true),
                cell(maybe(r.transfer), true),
                cell(money(r.withdrawals), true),
                cell(maybe(r.expected), true),
                cell(maybe(r.counted), true),
                cell(maybe(r.difference, signedMoney), true),
                cell(r.status, false, r.status !== "Cuadra"),
              ]),
            ],
          },
          layout: "lightHorizontalLines",
        };

  const sellersTable: Content =
    data.bySeller.length === 0
      ? { text: "" }
      : {
          margin: [0, 6, 0, 0],
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto", "auto", "auto"],
            body: [
              [
                "Vendedor",
                "Turnos",
                "Con diferencia",
                "Faltante",
                "Sobrante",
                "Neto",
              ].map((h, i) => cell(h, i > 0, true)),
              ...data.bySeller.map((s) => [
                cell(s.seller.name),
                cell(String(s.closed), true),
                cell(String(s.withDifference), true),
                cell(money(s.shortage), true),
                cell(money(s.surplus), true),
                cell(signedMoney(s.net), true),
              ]),
            ],
          },
          layout: "lightHorizontalLines",
        };

  return {
    info: { title: `Historial de cortes · ${meta.periodLabel}` },
    pageSize: "A4",
    pageOrientation: "landscape",
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
                text: "Historial de cortes",
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
        text: `Turnos cerrados: ${totals.closed} · Con diferencia: ${totals.withDifference} · Faltante: ${money(totals.shortage)} · Sobrante: ${money(totals.surplus)} · Neto: ${signedMoney(totals.net)}`,
        bold: true,
        margin: [0, 14, 0, 0],
      },
      { text: "Por vendedor", margin: [0, 12, 0, 0], bold: true },
      sellersTable,
      { text: "Turnos", margin: [0, 12, 0, 0], bold: true },
      shiftsTable,
    ],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Página ${currentPage} de ${pageCount}`,
      alignment: "center",
      fontSize: 8,
      margin: [0, 18, 0, 0],
    }),
  };
};

export const downloadCutsPdf = async (
  data: CutsExportData,
  periodLabel: string,
) => {
  const [logo, pdfMake] = await Promise.all([loadLogo(), loadPdfMake()]);
  const now = new Date();
  await pdfMake
    .createPdf(
      buildCutsPdfDefinition(data, { periodLabel, generatedAt: now, logo }),
    )
    .download(cutsFileName(now, "pdf"));
};

const MONEY_FMT = '"$"#,##0';

export const downloadCutsXlsx = async (data: CutsExportData) => {
  const { Workbook } = await import("exceljs");
  const rows = buildCutsRows(data.shifts);

  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Cortes");
  const moneyStyle = { numFmt: MONEY_FMT };
  const dt = { numFmt: "dd/mm/yyyy hh:mm" };
  sheet.columns = [
    { key: "seller", width: 18 },
    { key: "date", width: 12, style: { numFmt: "dd/mm/yyyy" } },
    { key: "opened", width: 18, style: dt },
    { key: "closed", width: 18, style: dt },
    { key: "openingFloat", width: 14, style: moneyStyle },
    { key: "tickets", width: 9 },
    { key: "cash", width: 12, style: moneyStyle },
    { key: "card", width: 12, style: moneyStyle },
    { key: "transfer", width: 12, style: moneyStyle },
    { key: "withdrawals", width: 12, style: moneyStyle },
    { key: "expected", width: 12, style: moneyStyle },
    { key: "counted", width: 12, style: moneyStyle },
    { key: "difference", width: 12, style: moneyStyle },
    { key: "status", width: 12 },
  ];
  sheet.addRow([...CUTS_EXPORT_HEAD]);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  rows.forEach((r) => sheet.addRow(r));

  const sellers = workbook.addWorksheet("Por vendedor");
  sellers.columns = [
    { key: "name", width: 20 },
    { key: "closed", width: 10 },
    { key: "withDifference", width: 16 },
    { key: "shortage", width: 12, style: moneyStyle },
    { key: "surplus", width: 12, style: moneyStyle },
    { key: "net", width: 12, style: moneyStyle },
  ];
  sellers.addRow([
    "Vendedor",
    "Turnos",
    "Con diferencia",
    "Faltante",
    "Sobrante",
    "Neto",
  ]);
  sellers.getRow(1).font = { bold: true };
  sellers.views = [{ state: "frozen", ySplit: 1 }];
  data.bySeller.forEach((s) => sellers.addRow({ name: s.seller.name, ...s }));
  const { totals } = data;
  sellers.addRow({ name: "Total del periodo", ...totals }).font = {
    bold: true,
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = cutsFileName(new Date(), "xlsx");
  link.click();
  URL.revokeObjectURL(url);
};
