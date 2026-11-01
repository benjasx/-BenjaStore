import {
  comboKey,
  computeCart,
  lineKey,
  parseLineKey,
  type Discount,
  type PricedItem,
  type PricedSauce,
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

const sauces: PricedSauce[] = [
  { id: "bbq", name: "bbq", extraPrice: 10 },
  { id: "hab", name: "habanero", extraPrice: 15 },
];

const run = (cart: Record<string, number>, promotions: Promotion[] = []) =>
  computeCart(cart, products, combos, promotions, sauces);

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

  describe("sauces", () => {
    const withBbq = lineKey("p100", { included: ["bbq"], extra: [] });
    const withExtra = lineKey("p100", { included: ["bbq"], extra: ["bbq"] });
    const withHab = lineKey("p100", { included: ["hab"], extra: [] });

    it("round-trips line keys and leaves keys without sauces unchanged", () => {
      expect(lineKey("p100")).toBe("p100");
      expect(lineKey("combo:c1", { included: [], extra: [] })).toBe("combo:c1");
      const key = lineKey("combo:c1", { included: ["b", "a"], extra: ["c"] });
      expect(key).toBe("combo:c1#a,b#c");
      expect(parseLineKey(key)).toEqual({
        baseKey: "combo:c1",
        selection: { included: ["a", "b"], extra: ["c"] },
      });
      expect(parseLineKey("p100")).toEqual({ baseKey: "p100" });
    });

    it("adds extras on top of the base price", () => {
      const r = run({ [withExtra]: 2 });
      expect(r.lines[0]).toMatchObject({
        gross: 200,
        extras: 20,
        sauces: { included: ["bbq"], extra: [{ name: "bbq", price: 10 }] },
      });
      expect(r.total).toBe(220);
    });

    it("keeps different selections as separate lines", () => {
      const r = run({ [withBbq]: 1, [withHab]: 1 });
      expect(r.lines).toHaveLength(2);
      expect(r.total).toBe(200);
    });

    it("does not discount extras with item promotions", () => {
      const r = run({ [withExtra]: 1 }, [
        itemPromo("a", { type: "percent", value: 20 }),
      ]);
      expect(r.lines[0].saving).toBe(20);
      expect(r.subtotal).toBe(90);
    });

    it("applies bundle across lines of the same item", () => {
      const r = run({ [withBbq]: 1, [withHab]: 1 }, [
        itemPromo("a", { type: "bundle", buy: 2, pay: 1 }),
      ]);
      expect(r.lines[0].saving).toBe(100);
      expect(r.lines[0].promotionName).toBe("a");
      expect(r.lines[1].saving).toBe(0);
      expect(r.lines[1].promotionName).toBeUndefined();
      expect(r.total).toBe(100);
    });

    it("counts extras in the sale promotion and its minimum", () => {
      const r = run(
        { [lineKey("p100", { included: [], extra: ["hab"] })]: 4 },
        [salePromo("s", { type: "percent", value: 10 }, 460)],
      );
      expect(r.subtotal).toBe(460);
      expect(r.saleSaving).toBe(46);
    });

    it("keeps lines with a missing sauce and charges no extra", () => {
      const key = lineKey("p100", { included: ["gone"], extra: ["gone"] });
      const r = run({ [key]: 1 });
      expect(r.lines[0].sauces).toEqual({
        included: ["salsa eliminada"],
        extra: [{ name: "salsa eliminada", price: 0 }],
      });
      expect(r.total).toBe(100);
    });

    it("prices combos with sauces", () => {
      const key = lineKey(comboKey("c1"), {
        included: ["bbq", "bbq"],
        extra: ["hab"],
      });
      const r = run({ [key]: 1 });
      expect(r.total).toBe(165);
    });
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
