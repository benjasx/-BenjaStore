import { Timestamp } from "firebase/firestore";
import {
  buildCutsPdfDefinition,
  buildCutsRows,
  CUTS_EXPORT_HEAD,
  cutsFileName,
  downloadCutsXlsx,
} from "@/lib/cutsExport";
import type { Shift } from "@/lib/shifts";

const at = (h: number) => Timestamp.fromDate(new Date(2026, 10, 1, h, 0));

const closed = (difference: number): Shift => ({
  id: "c",
  seller: { id: "a", name: "Ana" },
  openedAt: at(9),
  openingFloat: 500,
  withdrawals: [
    { amount: 100, reason: "Gas", at: at(12) },
    { amount: 50, reason: "Hielo", at: at(13) },
  ],
  closedAt: at(17),
  cut: {
    tickets: 4,
    total: 900,
    byMethod: { Efectivo: 600, Tarjeta: 200, "Transfer.": 100 },
    expected: 950,
    counted: 950 + difference,
    difference,
  },
});

const open: Shift = {
  id: "o",
  seller: { id: "b", name: "Beto" },
  openedAt: at(10),
  openingFloat: 300,
  withdrawals: [],
};

describe("cutsExport", () => {
  it("has one header per row field shown", () => {
    expect(CUTS_EXPORT_HEAD).toHaveLength(14);
  });

  it("builds a full row for a closed shift", () => {
    const [row] = buildCutsRows([closed(-150)]);
    expect(row).toMatchObject({
      seller: "Ana",
      openingFloat: 500,
      tickets: 4,
      cash: 600,
      card: 200,
      transfer: 100,
      withdrawals: 150,
      expected: 950,
      counted: 800,
      difference: -150,
      status: "Faltan",
    });
    expect(row.closed).toEqual(new Date(2026, 10, 1, 17, 0));
  });

  it("maps the status from the difference", () => {
    const statuses = [80, 0].map((d) => buildCutsRows([closed(d)])[0].status);
    expect(statuses).toEqual(["Sobran", "Cuadra"]);
  });

  it("leaves cut fields empty for an open shift", () => {
    const [row] = buildCutsRows([open]);
    expect(row).toMatchObject({
      seller: "Beto",
      openingFloat: 300,
      withdrawals: 0,
      closed: null,
      tickets: null,
      expected: null,
      counted: null,
      difference: null,
      status: "Abierto",
    });
  });

  it("names files by date", () => {
    const d = new Date(2026, 10, 3);
    expect(cutsFileName(d, "pdf")).toBe("cortes-2026-11-03.pdf");
    expect(cutsFileName(d, "xlsx")).toBe("cortes-2026-11-03.xlsx");
  });
});

describe("buildCutsPdfDefinition", () => {
  const data = {
    shifts: [closed(-150), open],
    totals: {
      closed: 1,
      withDifference: 1,
      shortage: 150,
      surplus: 0,
      net: -150,
    },
    bySeller: [
      {
        seller: { id: "a", name: "Ana" },
        closed: 1,
        withDifference: 1,
        shortage: 150,
        surplus: 0,
        net: -150,
      },
    ],
  };
  const meta = { periodLabel: "1 nov", generatedAt: new Date(2026, 10, 3) };
  const text = JSON.stringify(buildCutsPdfDefinition(data, meta));

  it("is landscape and shows period, summary and sellers", () => {
    const def = buildCutsPdfDefinition(data, meta);
    expect(def.pageOrientation).toBe("landscape");
    expect(text).toContain("Periodo: 1 nov");
    expect(text).toContain("Faltante: $150");
    expect(text).toContain("Por vendedor");
  });

  it("lists every visible shift with its status", () => {
    expect(text).toContain("Faltan");
    expect(text).toContain("Abierto");
    expect(text).toContain("Beto");
  });

  it("shows a note without shifts", () => {
    const empty = JSON.stringify(
      buildCutsPdfDefinition({ ...data, shifts: [], bySeller: [] }, meta),
    );
    expect(empty).toContain("Sin turnos en este periodo.");
  });
});

describe("downloadCutsXlsx", () => {
  it("writes the Cortes and Por vendedor sheets and downloads the file", async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), "blob:x"));
    URL.revokeObjectURL = vi.fn();
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download);
    });

    await downloadCutsXlsx({
      shifts: [closed(-150), open],
      totals: {
        closed: 1,
        withDifference: 1,
        shortage: 150,
        surplus: 0,
        net: -150,
      },
      bySeller: [
        {
          seller: { id: "a", name: "Ana" },
          closed: 1,
          withDifference: 1,
          shortage: 150,
          surplus: 0,
          net: -150,
        },
      ],
    });

    expect(names[0]).toMatch(/^cortes-\d{4}-\d{2}-\d{2}\.xlsx$/);
    const { Workbook } = await import("exceljs");
    const wb = new Workbook();
    await wb.xlsx.load(await blobs[0].arrayBuffer());
    const cortes = wb.getWorksheet("Cortes")!;
    expect(cortes.rowCount).toBe(3);
    expect(cortes.getRow(1).getCell(14).value).toBe("Estado");
    expect(cortes.getRow(2).getCell(13).value).toBe(-150);
    expect(cortes.getRow(3).getCell(14).value).toBe("Abierto");
    const sellers = wb.getWorksheet("Por vendedor")!;
    expect(sellers.getRow(2).getCell(1).value).toBe("Ana");
    expect(sellers.getRow(3).getCell(1).value).toBe("Total del periodo");
  }, 30_000);
});
