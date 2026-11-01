import { Timestamp } from "firebase/firestore";
import {
  buildExportRows,
  buildSalesPdfDefinition,
  exportFileName,
  exportPeriodLabel,
  summarize,
} from "@/lib/salesExport";
import type { Sale } from "@/lib/sales";

vi.mock("@/lib/firebase", () => ({ db: {} }));

const sale = (folio: number, overrides: Partial<Sale> = {}): Sale => ({
  id: `s${folio}`,
  folio,
  createdAt: Timestamp.fromDate(new Date(2026, 10, 1, 13, 5)),
  channel: "Mostrador",
  lines: [],
  subtotal: 100,
  saleSaving: 0,
  total: 100,
  paymentMethod: "Efectivo",
  ...overrides,
});

const sales = [
  sale(2, { seller: { id: "lu", name: "Luis" }, total: 230 }),
  sale(1, {
    total: 50,
    cancelled: { at: Timestamp.now(), reason: "Se arrepintió" },
  }),
];

describe("salesExport", () => {
  it("arma las filas con vendedor, estado y motivo", () => {
    const [a, b] = buildExportRows(sales);
    expect(a).toMatchObject({
      folio: "0002",
      seller: "Luis",
      status: "Activa",
    });
    expect(b).toMatchObject({
      folio: "0001",
      seller: "—",
      status: "Cancelada",
      reason: "Se arrepintió",
    });
  });

  it("el total excluye las canceladas", () => {
    expect(summarize(sales)).toEqual({ active: 1, cancelled: 1, total: 230 });
  });

  it("etiqueta el periodo y nombra el archivo", () => {
    const start = new Date(2026, 10, 1);
    expect(exportPeriodLabel({ start, end: new Date(2026, 10, 2) })).toBe(
      "1 nov",
    );
    expect(exportPeriodLabel({ start, end: new Date(2026, 10, 8) })).toBe(
      "1 nov – 7 nov",
    );
    expect(exportFileName(new Date(2026, 10, 1), "xlsx")).toBe(
      "ventas-2026-11-01.xlsx",
    );
  });

  it("el PDF incluye todas las ventas y el resumen", () => {
    const def = buildSalesPdfDefinition(sales, {
      periodLabel: "1 nov",
      generatedAt: new Date(2026, 10, 1, 14, 0),
    });
    const json = JSON.stringify(def.content);
    expect(json).toContain("#0002");
    expect(json).toContain("#0001");
    expect(json).toContain("Total vendido: $230");
  });

  it("sin ventas el PDF muestra el mensaje", () => {
    const def = buildSalesPdfDefinition([], {
      periodLabel: "1 nov",
      generatedAt: new Date(),
    });
    expect(JSON.stringify(def.content)).toContain(
      "Sin ventas en este periodo.",
    );
  });
});
