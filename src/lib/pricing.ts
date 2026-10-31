export type Discount =
  | { type: "percent"; value: number }
  | { type: "amount"; value: number }
  | { type: "bundle"; buy: number; pay: number };

export type PromotionTarget = { kind: "product" | "combo"; id: string };

export type Promotion =
  | {
      id: string;
      name: string;
      enabled: boolean;
      scope: "item";
      target: PromotionTarget;
      discount: Discount;
    }
  | {
      id: string;
      name: string;
      enabled: boolean;
      scope: "sale";
      discount: Exclude<Discount, { type: "bundle" }>;
      minSubtotal?: number;
    };

export interface PricedItem {
  id: string;
  name: string;
  price: number;
}

export interface CartLine {
  key: string;
  name: string;
  qty: number;
  unitPrice: number;
  gross: number;
  saving: number;
  promotionName?: string;
}

export interface CartTotals {
  lines: CartLine[];
  subtotal: number;
  saleSaving: number;
  saleName?: string;
  total: number;
}

export const COMBO_KEY_PREFIX = "combo:";

export const comboKey = (comboId: string) => `${COMBO_KEY_PREFIX}${comboId}`;

const lineSaving = (discount: Discount, unitPrice: number, qty: number) => {
  const gross = unitPrice * qty;
  switch (discount.type) {
    case "percent":
      return Math.round((gross * discount.value) / 100);
    case "amount":
      return Math.min(discount.value * qty, gross);
    case "bundle":
      return (
        Math.floor(qty / discount.buy) *
        (discount.buy - discount.pay) *
        unitPrice
      );
  }
};

const saleDiscountSaving = (
  discount: Exclude<Discount, { type: "bundle" }>,
  subtotal: number,
) =>
  discount.type === "percent"
    ? Math.round((subtotal * discount.value) / 100)
    : Math.min(discount.value, subtotal);

// Mayor ahorro gana; empate por nombre.
const pickBest = <T extends { name: string }>(
  candidates: { promo: T; saving: number }[],
) =>
  candidates
    .filter((c) => c.saving > 0)
    .sort(
      (a, b) => b.saving - a.saving || a.promo.name.localeCompare(b.promo.name),
    )[0];

export function computeCart(
  cart: Record<string, number>,
  products: PricedItem[],
  combos: PricedItem[],
  promotions: Promotion[],
): CartTotals {
  const active = promotions.filter((p) => p.enabled);
  const lines: CartLine[] = [];

  for (const [key, qty] of Object.entries(cart)) {
    if (qty <= 0) continue;
    const isCombo = key.startsWith(COMBO_KEY_PREFIX);
    const id = isCombo ? key.slice(COMBO_KEY_PREFIX.length) : key;
    const item = (isCombo ? combos : products).find((i) => i.id === id);
    if (!item) continue;

    const kind = isCombo ? "combo" : "product";
    const best = pickBest(
      active.flatMap((promo) =>
        promo.scope === "item" &&
        promo.target.kind === kind &&
        promo.target.id === id
          ? [{ promo, saving: lineSaving(promo.discount, item.price, qty) }]
          : [],
      ),
    );

    lines.push({
      key,
      name: item.name,
      qty,
      unitPrice: item.price,
      gross: item.price * qty,
      saving: best?.saving ?? 0,
      promotionName: best?.promo.name,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.gross - l.saving, 0);

  const bestSale = pickBest(
    active.flatMap((promo) =>
      promo.scope === "sale" &&
      (promo.minSubtotal === undefined || subtotal >= promo.minSubtotal)
        ? [{ promo, saving: saleDiscountSaving(promo.discount, subtotal) }]
        : [],
    ),
  );
  const saleSaving = bestSale?.saving ?? 0;

  return {
    lines,
    subtotal,
    saleSaving,
    saleName: bestSale?.promo.name,
    total: Math.max(0, subtotal - saleSaving),
  };
}
