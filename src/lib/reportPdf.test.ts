import type { TDocumentDefinitions } from "pdfmake/interfaces";
import {
  buildPdfDefinition,
  pdfFileName,
  type PdfKind,
  type PdfMeta,
} from "@/lib/reportPdf";
import type { ReportSale } from "@/lib/reports";
import type { SaleLine } from "@/lib/sales";

const day = (hour: number, minute = 0) => new Date(2026, 9, 28, hour, minute);
const range = { start: new Date(2026, 9, 28), end: new Date(2026, 9, 29) };
const meta: PdfMeta = {
  periodLabel: "miércoles 28 oct",
  generatedAt: new Date(2026, 9, 28, 21, 5),
  logo: "data:image/jpeg;base64,AAAA",
};

const line = (overrides: Partial<SaleLine> = {}): SaleLine => ({
  kind: "product",
  itemId: "bu",
  name: "burrito",
  qty: 1,
  unitPrice: 100,
  gross: 100,
  saving: 0,
  extras: 0,
  ...overrides,
});

const sales: ReportSale[] = [
  {
    createdAt: day(19, 30),
    channel: "Mostrador",
    folio: 1,
    paymentMethod: "Efectivo",
    seller: { id: "an", name: "Ana" },
    saleSaving: 0,
    total: 130,
    lines: [
      line({
        qty: 2,
        gross: 200,
        saving: 90,
        promotionName: "2x1 burrito",
        extras: 20,
        sauces: { included: ["bbq"], extra: [{ name: "ranch", price: 10 }] },
      }),
    ],
  },
  {
    createdAt: day(20, 10),
    channel: "WhatsApp",
    folio: 2,
    paymentMethod: "Tarjeta",
    saleSaving: 15,
    total: 135,
    lines: [
      line({
        kind: "combo",
        itemId: "c1",
        name: "combo uno",
        unitPrice: 150,
        gross: 150,
        contents: "burrito y refresco",
      }),
    ],
  },
];

const text = (def: TDocumentDefinitions) => JSON.stringify(def);

describe("pdfFileName", () => {
  it("names the file by report and date", () => {
    expect(pdfFileName("top-items", new Date(2026, 9, 8))).toBe(
      "reporte-productos-mas-vendidos-2026-10-08.pdf",
    );
    expect(pdfFileName("general", new Date(2026, 9, 28))).toBe(
      "reporte-general-2026-10-28.pdf",
    );
  });
});

describe("buildPdfDefinition", () => {
  const kinds: PdfKind[] = ["top-items", "hours", "tickets", "general"];

  it.each(kinds)("%s includes logo, period and generation date", (kind) => {
    const def = buildPdfDefinition(kind, sales, range, meta);
    expect(def.images).toEqual({ logo: meta.logo });
    expect(text(def)).toContain('"image":"logo"');
    expect(text(def)).toContain("Periodo: miércoles 28 oct");
    expect(text(def)).toContain("Generado: 28/10/2026 21:05");
    expect(typeof def.footer).toBe("function");
  });

  it("still builds without a logo", () => {
    const def = buildPdfDefinition("tickets", sales, range, {
      ...meta,
      logo: undefined,
    });
    expect(def.images).toBeUndefined();
    expect(text(def)).not.toContain('"image":"logo"');
  });

  it.each(kinds)("%s shows the empty message without sales", (kind) => {
    const def = buildPdfDefinition(kind, [], range, meta);
    expect(text(def)).toContain("Sin ventas en este periodo.");
  });

  it("lists every product and combo in the ranking", () => {
    const many: ReportSale[] = [
      {
        ...sales[0],
        lines: Array.from({ length: 8 }, (_, i) =>
          line({ itemId: `p${i}`, name: `producto ${i}`, qty: i + 1 }),
        ),
      },
    ];
    const content = text(buildPdfDefinition("top-items", many, range, meta));
    for (let i = 0; i < 8; i++) expect(content).toContain(`producto ${i}`);
  });

  it("sums sales for each hour of the day", () => {
    const content = text(buildPdfDefinition("hours", sales, range, meta));
    expect(content).toContain("19:00 – 19:59");
    expect(content).toContain("20:00 – 20:59");
    expect(content).toContain("$130");
    expect(content).toContain("$135");
    expect(content).toContain("$265");
  });

  it("summarizes tickets by channel and payment method", () => {
    const content = text(buildPdfDefinition("tickets", sales, range, meta));
    expect(content).toContain("Total de tickets");
    expect(content).toContain("$265");
    expect(content).toContain("$133");
    expect(content).toContain("Mostrador");
    expect(content).toContain("Efectivo");
    expect(content).toContain("Tarjeta");
  });

  it("breaks every ticket down in the general report", () => {
    const content = text(buildPdfDefinition("general", sales, range, meta));
    expect(content).toContain(
      "Ticket #0001 · 28/10/2026 19:30 · Vendedor: Ana",
    );
    expect(content).toContain("Ticket #0002");
    expect(content).toContain("Sin vendedor");
    expect(content).toContain("Salsa: bbq");
    expect(content).toContain("Extra: ranch");
    expect(content).toContain("2x1 burrito −$90");
    expect(content).toContain("burrito y refresco");
    expect(content).toContain("Descuento de venta −$15");
    expect(content).toContain("Total del ticket: $130");
    expect(content).toContain("Total general: $265 · 2 tickets");
  });

  it("ignores sales outside the range", () => {
    const outside: ReportSale = {
      ...sales[0],
      createdAt: new Date(2026, 9, 27, 12),
      total: 999,
    };
    const content = text(
      buildPdfDefinition("general", [...sales, outside], range, meta),
    );
    expect(content).not.toContain("$999");
  });

  it("generates a real PDF document from every definition", async () => {
    const [{ default: pdfMake }, vfs] = await Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts"),
    ]);
    pdfMake.addVirtualFileSystem(vfs.default);
    for (const kind of kinds) {
      const buffer = await pdfMake
        .createPdf(
          buildPdfDefinition(kind, sales, range, { ...meta, logo: undefined }),
        )
        .getBuffer();
      expect(buffer.byteLength).toBeGreaterThan(500);
    }
  }, 30000);
});
