import {
  comboKey,
  computeCart,
  type Discount,
  type PricedItem,
  type Promotion,
  type PromotionTarget,
} from "@/lib/pricing";

const products: PricedItem[] = [
  { id: "p100", name: "burrito", price: 100 },
  { id: "p10", name: "refresco", price: 10 },
];
const combos: PricedItem[] = [{ id: "c1", name: "combo uno", price: 150 }];

const itemPromo = (
  id: string,
  discount: Discount,
  target: PromotionTarget = { kind: "product", id: "p100" },
  enabled = true,
): Promotion => ({
  id,
  name: id,
  enabled,
  scope: "item",
  target,
  discount,
});

const salePromo = (
  id: string,
  discount:
    { type: "percent"; value: number } | { type: "amount"; value: number },
  minSubtotal?: number,
): Promotion => ({
  id,
  name: id,
  enabled: true,
  scope: "sale",
  discount,
  minSubtotal,
});

const run = (cart: Record<string, number>, promotions: Promotion[] = []) =>
  computeCart(cart, products, combos, promotions);

describe("computeCart", () => {
  it("sums prices without promotions", () => {
    const r = run({ p100: 2, p10: 1 });
    expect(r.subtotal).toBe(210);
    expect(r.total).toBe(210);
    expect(r.saleSaving).toBe(0);
  });

  it("prices a combo at its fixed price", () => {
    const r = run({ [comboKey("c1")]: 2 });
    expect(r.lines[0]).toMatchObject({ key: "combo:c1", gross: 300 });
    expect(r.total).toBe(300);
  });

  it("ignores cart keys whose item no longer exists", () => {
    const r = run({ gone: 1, "combo:gone": 1, p10: 1 });
    expect(r.lines).toHaveLength(1);
    expect(r.total).toBe(10);
  });

  it("applies percent to the line", () => {
    const r = run({ p100: 2 }, [
      itemPromo("a", { type: "percent", value: 20 }),
    ]);
    expect(r.lines[0].saving).toBe(40);
    expect(r.total).toBe(160);
  });

  it("applies amount per unit", () => {
    const r = run({ p100: 2 }, [itemPromo("a", { type: "amount", value: 15 })]);
    expect(r.lines[0].saving).toBe(30);
  });

  it("caps amount at the line price", () => {
    const r = run({ p10: 2 }, [
      itemPromo(
        "a",
        { type: "amount", value: 15 },
        { kind: "product", id: "p10" },
      ),
    ]);
    expect(r.lines[0].saving).toBe(20);
    expect(r.total).toBe(0);
  });

  it("applies bundle 2x1", () => {
    const promo = itemPromo("a", { type: "bundle", buy: 2, pay: 1 });
    const three = run({ p100: 3 }, [promo]);
    expect(three.lines[0].saving).toBe(100);
    expect(three.total).toBe(200);
    expect(run({ p100: 1 }, [promo]).lines[0].saving).toBe(0);
  });

  it("applies item promotions to combos", () => {
    const r = run({ [comboKey("c1")]: 1 }, [
      itemPromo(
        "a",
        { type: "percent", value: 10 },
        { kind: "combo", id: "c1" },
      ),
    ]);
    expect(r.lines[0].saving).toBe(15);
  });

  it("does not match a product promo to a combo with the same id", () => {
    const r = run({ [comboKey("c1")]: 1 }, [
      itemPromo(
        "a",
        { type: "percent", value: 10 },
        { kind: "product", id: "c1" },
      ),
    ]);
    expect(r.lines[0].saving).toBe(0);
  });

  it("picks the promotion with the highest saving", () => {
    const r = run({ p100: 2 }, [
      itemPromo("small", { type: "percent", value: 10 }),
      itemPromo("big", { type: "percent", value: 30 }),
    ]);
    expect(r.lines[0].saving).toBe(60);
    expect(r.lines[0].promotionName).toBe("big");
  });

  it("breaks ties by name", () => {
    const r = run({ p100: 1 }, [
      itemPromo("b", { type: "percent", value: 10 }),
      itemPromo("a", { type: "amount", value: 10 }),
    ]);
    expect(r.lines[0].promotionName).toBe("a");
  });

  it("ignores disabled promotions", () => {
    const r = run({ p100: 1 }, [
      itemPromo("a", { type: "percent", value: 50 }, undefined, false),
    ]);
    expect(r.lines[0].saving).toBe(0);
    expect(r.lines[0].promotionName).toBeUndefined();
  });

  it("ignores promotions whose target is missing", () => {
    const r = run({ p100: 1 }, [
      itemPromo(
        "a",
        { type: "percent", value: 50 },
        { kind: "product", id: "gone" },
      ),
    ]);
    expect(r.total).toBe(100);
  });

  it("applies sale percent only from the minimum subtotal", () => {
    const promo = salePromo("s", { type: "percent", value: 10 }, 500);
    const products500: PricedItem[] = [
      { id: "a", name: "a", price: 499 },
      { id: "b", name: "b", price: 500 },
    ];
    const below = computeCart({ a: 1 }, products500, [], [promo]);
    expect(below.saleSaving).toBe(0);
    expect(below.total).toBe(499);
    const at = computeCart({ b: 1 }, products500, [], [promo]);
    expect(at.saleSaving).toBe(50);
    expect(at.total).toBe(450);
    expect(at.saleName).toBe("s");
  });

  it("applies sale amount capped at the subtotal", () => {
    const r = run({ p10: 1 }, [salePromo("s", { type: "amount", value: 50 })]);
    expect(r.saleSaving).toBe(10);
    expect(r.total).toBe(0);
  });

  it("computes the sale promotion over the already discounted subtotal", () => {
    const r = run({ p100: 2 }, [
      itemPromo("i", { type: "percent", value: 50 }),
      salePromo("s", { type: "percent", value: 10 }),
    ]);
    expect(r.subtotal).toBe(100);
    expect(r.saleSaving).toBe(10);
    expect(r.total).toBe(90);
  });

  it("checks the minimum against the discounted subtotal", () => {
    const r = run({ p100: 2 }, [
      itemPromo("i", { type: "percent", value: 50 }),
      salePromo("s", { type: "percent", value: 10 }, 150),
    ]);
    expect(r.saleSaving).toBe(0);
  });

  it("picks the best sale promotion", () => {
    const r = run({ p100: 1 }, [
      salePromo("small", { type: "percent", value: 5 }),
      salePromo("big", { type: "amount", value: 40 }),
    ]);
    expect(r.saleSaving).toBe(40);
    expect(r.saleName).toBe("big");
  });

  it("never returns a negative total", () => {
    const r = run({ p10: 1 }, [
      itemPromo(
        "i",
        { type: "percent", value: 100 },
        { kind: "product", id: "p10" },
      ),
      salePromo("s", { type: "amount", value: 999 }),
    ]);
    expect(r.total).toBe(0);
  });
});
