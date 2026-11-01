import type { CartTotals } from "@/lib/pricing";
import { buildSale } from "@/lib/sales";

vi.mock("@/lib/firebase", () => ({ db: {} }));

const totals: CartTotals = {
  lines: [
    {
      key: "p1#bbq#bbq",
      name: "burrito",
      qty: 2,
      unitPrice: 100,
      gross: 200,
      saving: 20,
      promotionName: "20%",
      sauces: { included: ["bbq"], extra: [{ name: "bbq", price: 10 }] },
      extras: 20,
    },
    {
      key: "combo:c1",
      name: "combo uno",
      qty: 1,
      unitPrice: 150,
      gross: 150,
      saving: 0,
      extras: 0,
    },
  ],
  subtotal: 350,
  saleSaving: 35,
  saleName: "10% venta",
  total: 315,
};

const contents = (id: string) => (id === "c1" ? "1× burrito" : undefined);

describe("buildSale", () => {
  it("snapshots lines, totals and sauces", () => {
    const sale = buildSale({
      totals,
      channel: "Mostrador",
      payment: { method: "Tarjeta" },
      comboContents: contents,
    });
    expect(sale.lines[0]).toEqual({
      kind: "product",
      itemId: "p1",
      name: "burrito",
      qty: 2,
      unitPrice: 100,
      gross: 200,
      saving: 20,
      promotionName: "20%",
      sauces: { included: ["bbq"], extra: [{ name: "bbq", price: 10 }] },
      extras: 20,
    });
    expect(sale.lines[1]).toEqual({
      kind: "combo",
      itemId: "c1",
      name: "combo uno",
      qty: 1,
      unitPrice: 150,
      gross: 150,
      saving: 0,
      contents: "1× burrito",
      extras: 0,
    });
    expect(sale).toMatchObject({
      channel: "Mostrador",
      subtotal: 350,
      saleSaving: 35,
      saleName: "10% venta",
      total: 315,
      paymentMethod: "Tarjeta",
    });
  });

  it("stores received and change only for cash", () => {
    const cash = buildSale({
      totals,
      channel: "Llevar",
      payment: { method: "Efectivo", received: 500 },
      comboContents: contents,
    });
    expect(cash.received).toBe(500);
    expect(cash.change).toBe(185);
    const card = buildSale({
      totals,
      channel: "Llevar",
      payment: { method: "Transfer.", received: 500 },
      comboContents: contents,
    });
    expect(card).not.toHaveProperty("received");
    expect(card).not.toHaveProperty("change");
  });

  it("stores the trimmed transaction reference only for card and transfer", () => {
    const input = {
      totals,
      channel: "Mostrador",
      comboContents: contents,
    };
    const card = buildSale({
      ...input,
      payment: { method: "Tarjeta", reference: " AB123 " },
    });
    expect(card.reference).toBe("AB123");
    const blank = buildSale({
      ...input,
      payment: { method: "Transfer.", reference: "   " },
    });
    expect(blank).not.toHaveProperty("reference");
    const cash = buildSale({
      ...input,
      payment: { method: "Efectivo", received: 500, reference: "AB123" },
    });
    expect(cash).not.toHaveProperty("reference");
  });

  it("omits optional fields that are absent", () => {
    const sale = buildSale({
      totals: { ...totals, saleSaving: 0, saleName: undefined, total: 350 },
      channel: "Mostrador",
      payment: { method: "Tarjeta" },
      comboContents: () => undefined,
    });
    expect(sale).not.toHaveProperty("saleName");
    expect(sale.lines[1]).not.toHaveProperty("contents");
    expect(sale.lines[1]).not.toHaveProperty("promotionName");
    expect(sale.lines[1]).not.toHaveProperty("sauces");
  });
});
