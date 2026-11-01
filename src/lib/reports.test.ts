import {
  buildReport,
  compare,
  getPeriodRanges,
  type ReportSale,
} from "@/lib/reports";
import type { SaleLine } from "@/lib/sales";

// Miércoles 28 de octubre de 2026.
const now = new Date(2026, 9, 28, 20, 30);
const d = (month: number, day: number, hour = 12, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute);

const line = (overrides: Partial<SaleLine> = {}): SaleLine => ({
  kind: "product",
  itemId: "p1",
  name: "burrito",
  qty: 1,
  unitPrice: 100,
  gross: 100,
  saving: 0,
  extras: 0,
  ...overrides,
});

const sale = (
  createdAt: Date,
  total: number,
  overrides: Partial<ReportSale> = {},
): ReportSale => ({
  createdAt,
  channel: "Mostrador",
  lines: [line({ unitPrice: total, gross: total })],
  saleSaving: 0,
  total,
  ...overrides,
});

const today = getPeriodRanges("Hoy", now)!.current;

describe("getPeriodRanges", () => {
  it("Hoy compares with the same weekday last week", () => {
    const r = getPeriodRanges("Hoy", now)!;
    expect(r.current).toEqual({ start: d(10, 28, 0), end: d(10, 29, 0) });
    expect(r.previous).toEqual({ start: d(10, 21, 0), end: d(10, 22, 0) });
  });

  it("Semana starts on Monday and compares up to the same weekday", () => {
    const r = getPeriodRanges("Semana", now)!;
    expect(r.current).toEqual({ start: d(10, 26, 0), end: d(10, 29, 0) });
    expect(r.previous).toEqual({ start: d(10, 19, 0), end: d(10, 22, 0) });
  });

  it("Semana on a Sunday still starts on the previous Monday", () => {
    const r = getPeriodRanges("Semana", d(11, 1, 10))!;
    expect(r.current.start).toEqual(d(10, 26, 0));
  });

  it("Mes starts on day 1 and compares up to the same day of the month", () => {
    const r = getPeriodRanges("Mes", now)!;
    expect(r.current).toEqual({ start: d(10, 1, 0), end: d(10, 29, 0) });
    expect(r.previous).toEqual({ start: d(9, 1, 0), end: d(9, 29, 0) });
  });

  it("Mes on day 31 clamps the previous month to its length", () => {
    const r = getPeriodRanges("Mes", d(10, 31, 9))!;
    expect(r.previous).toEqual({ start: d(9, 1, 0), end: d(10, 1, 0) });
  });

  it("Rango includes both dates and compares with the previous equal period", () => {
    const r = getPeriodRanges("Rango", now, {
      from: d(10, 10, 15),
      to: d(10, 12, 3),
    })!;
    expect(r.current).toEqual({ start: d(10, 10, 0), end: d(10, 13, 0) });
    expect(r.previous).toEqual({ start: d(10, 7, 0), end: d(10, 10, 0) });
  });

  it("Rango defaults to today and rejects invalid ranges", () => {
    expect(getPeriodRanges("Rango", now)!.current).toEqual(today);
    expect(
      getPeriodRanges("Rango", now, { from: d(10, 12), to: d(10, 10) }),
    ).toBeNull();
    expect(
      getPeriodRanges("Rango", now, { from: d(1, 1), to: d(4, 3) }),
    ).toBeNull();
    expect(
      getPeriodRanges("Rango", now, { from: d(1, 1), to: d(4, 2) }),
    ).not.toBeNull();
  });
});

describe("buildReport", () => {
  it("returns zeros without sales", () => {
    const r = buildReport([], today, "Hoy");
    expect(r).toMatchObject({ total: 0, tickets: 0, average: 0, buckets: [] });
    expect(r.topItems).toEqual([]);
    expect(r.sauces).toEqual([]);
    expect(r.discounts).toEqual({ tickets: 0, amount: 0 });
  });

  it("sums totals, tickets and average", () => {
    const r = buildReport(
      [sale(d(10, 28, 14), 100), sale(d(10, 28, 15), 50)],
      today,
      "Hoy",
    );
    expect(r).toMatchObject({ total: 150, tickets: 2, average: 75 });
  });

  it("ignores sales outside the range", () => {
    const r = buildReport(
      [sale(d(10, 28, 14), 100), sale(d(10, 27, 23, 59), 999)],
      today,
      "Hoy",
    );
    expect(r.total).toBe(100);
  });

  it("builds hour buckets with a one hour margin and marks the peak", () => {
    const r = buildReport(
      [
        sale(d(10, 28, 19, 30), 100),
        sale(d(10, 28, 20, 10), 150),
        sale(d(10, 28, 20, 40), 50),
      ],
      today,
      "Hoy",
    );
    expect(r.bucketUnit).toBe("hour");
    expect(r.buckets.map((b) => b.label)).toEqual(["18", "19", "20", "21"]);
    expect(r.buckets.map((b) => b.total)).toEqual([0, 100, 200, 0]);
    expect(r.buckets.find((b) => b.peak)?.title).toBe("20:00");
  });

  it("clamps hour buckets to 0-23", () => {
    const r = buildReport(
      [sale(d(10, 28, 0, 5), 10), sale(d(10, 28, 23, 50), 10)],
      today,
      "Hoy",
    );
    expect(r.buckets[0].label).toBe("0");
    expect(r.buckets.at(-1)?.label).toBe("23");
  });

  it("builds one bucket per day for longer periods", () => {
    const range = getPeriodRanges("Semana", now)!.current;
    const r = buildReport(
      [
        sale(d(10, 26, 13), 100),
        sale(d(10, 28, 13), 300),
        sale(d(10, 28, 20), 50),
      ],
      range,
      "Semana",
    );
    expect(r.bucketUnit).toBe("day");
    expect(r.buckets.map((b) => b.label)).toEqual(["26", "27", "28"]);
    expect(r.buckets.map((b) => b.total)).toEqual([100, 0, 350]);
    expect(r.buckets.find((b) => b.peak)?.title).toBe("28 oct");
  });

  it("has no peak when nothing was sold", () => {
    const range = getPeriodRanges("Semana", now)!.current;
    const r = buildReport([], range, "Semana");
    expect(r.buckets).toHaveLength(3);
    expect(r.buckets.some((b) => b.peak)).toBe(false);
  });

  it("ranks products and combos together by quantity, top 5", () => {
    const lines = [
      line({ itemId: "a", name: "alitas", qty: 4 }),
      line({ kind: "combo", itemId: "c1", name: "combo uno", qty: 2 }),
      line({ itemId: "b", name: "boneless", qty: 2 }),
      line({ itemId: "c", name: "papas", qty: 1 }),
      line({ itemId: "d", name: "refresco", qty: 1 }),
      line({ itemId: "e", name: "extra", qty: 1 }),
      line({ itemId: "a", name: "alitas", qty: 2 }),
    ];
    const r = buildReport([sale(d(10, 28, 14), 100, { lines })], today, "Hoy");
    expect(r.topItems).toHaveLength(5);
    expect(r.topItems.map((i) => [i.name, i.qty, i.pct])).toEqual([
      ["alitas", 6, 100],
      ["boneless", 2, 33],
      ["combo uno", 2, 33],
      ["extra", 1, 17],
      ["papas", 1, 17],
    ]);
  });

  it("does not mix a product and a combo with the same id", () => {
    const lines = [
      line({ itemId: "x", name: "producto", qty: 1 }),
      line({ kind: "combo", itemId: "x", name: "combo", qty: 1 }),
    ];
    const r = buildReport([sale(d(10, 28, 14), 100, { lines })], today, "Hoy");
    expect(r.topItems).toHaveLength(2);
  });

  it("uses the name from the most recent sale", () => {
    const r = buildReport(
      [
        sale(d(10, 28, 12), 10, { lines: [line({ name: "viejo" })] }),
        sale(d(10, 28, 18), 10, { lines: [line({ name: "nuevo" })] }),
        sale(d(10, 28, 15), 10, { lines: [line({ name: "medio" })] }),
      ],
      today,
      "Hoy",
    );
    expect(r.topItems[0]).toMatchObject({ name: "nuevo", qty: 3 });
  });

  it("counts each sauce choice once per line regardless of quantity, ignoring removed ones", () => {
    const lines = [
      line({
        qty: 2,
        sauces: {
          included: ["bbq"],
          extra: [{ name: "bbq", price: 10 }],
        },
      }),
      line({
        qty: 1,
        sauces: {
          included: ["ranch", "salsa eliminada"],
          extra: [],
        },
      }),
    ];
    const r = buildReport([sale(d(10, 28, 14), 100, { lines })], today, "Hoy");
    expect(r.sauces).toEqual([
      { name: "bbq", count: 2, pct: 67 },
      { name: "ranch", count: 1, pct: 33 },
    ]);
  });

  it("shows at most 6 sauces", () => {
    const names = ["a", "b", "c", "d", "e", "f", "g"];
    const lines = [line({ sauces: { included: names, extra: [] } })];
    const r = buildReport([sale(d(10, 28, 14), 100, { lines })], today, "Hoy");
    expect(r.sauces).toHaveLength(6);
  });

  it("always lists the four channels and appends unknown ones", () => {
    const r = buildReport(
      [
        sale(d(10, 28, 14), 100),
        sale(d(10, 28, 15), 50),
        sale(d(10, 28, 16), 30, { channel: "WhatsApp" }),
        sale(d(10, 28, 17), 20, { channel: "Uber" }),
      ],
      today,
      "Hoy",
    );
    expect(r.channels).toEqual([
      { channel: "Mostrador", total: 150, tickets: 2 },
      { channel: "Llevar", total: 0, tickets: 0 },
      { channel: "WhatsApp", total: 30, tickets: 1 },
      { channel: "Domicilio", total: 0, tickets: 0 },
      { channel: "Uber", total: 20, tickets: 1 },
    ]);
  });

  it("counts tickets with discounts and the amount saved", () => {
    const r = buildReport(
      [
        sale(d(10, 28, 14), 100, {
          lines: [line({ saving: 20 })],
          saleSaving: 10,
        }),
        sale(d(10, 28, 15), 50),
      ],
      today,
      "Hoy",
    );
    expect(r.discounts).toEqual({ tickets: 1, amount: 30 });
  });
});

describe("compare", () => {
  const previous: ReportSale[] = [sale(d(10, 21, 14), 80)];

  it("returns the rounded percentage change", () => {
    expect(compare(100, previous)).toEqual({
      previousTotal: 80,
      changePct: 25,
    });
    expect(compare(60, previous).changePct).toBe(-25);
  });

  it("returns null when the previous period sold nothing", () => {
    expect(compare(100, [])).toEqual({ previousTotal: 0, changePct: null });
  });
});
