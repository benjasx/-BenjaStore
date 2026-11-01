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

export interface PricedSauce {
  id: string;
  name: string;
  extraPrice: number;
}

export interface SauceSelection {
  included: string[];
  extra: string[];
}

export interface CartLine {
  key: string;
  name: string;
  qty: number;
  unitPrice: number;
  gross: number;
  saving: number;
  promotionName?: string;
  sauces?: {
    included: string[];
    extra: { name: string; price: number }[];
  };
  extras: number;
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

const KEY_SEPARATOR = "#";
const ID_SEPARATOR = ",";
export const MISSING_SAUCE_NAME = "salsa eliminada";

export const lineKey = (baseKey: string, selection?: SauceSelection) => {
  if (!selection || (!selection.included.length && !selection.extra.length)) {
    return baseKey;
  }
  const part = (ids: string[]) => [...ids].sort().join(ID_SEPARATOR);
  return [baseKey, part(selection.included), part(selection.extra)].join(
    KEY_SEPARATOR,
  );
};

export const parseLineKey = (
  key: string,
): { baseKey: string; selection?: SauceSelection } => {
  const [baseKey, included, extra] = key.split(KEY_SEPARATOR);
  if (included === undefined) return { baseKey };
  const ids = (part?: string) => (part ? part.split(ID_SEPARATOR) : []);
  return { baseKey, selection: { included: ids(included), extra: ids(extra) } };
};

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
  sauces: PricedSauce[] = [],
): CartTotals {
  const active = promotions.filter((p) => p.enabled);
  const lines: CartLine[] = [];

  const entries = Object.entries(cart).flatMap(([key, qty]) => {
    if (qty <= 0) return [];
    const { baseKey, selection } = parseLineKey(key);
    const isCombo = baseKey.startsWith(COMBO_KEY_PREFIX);
    const id = isCombo ? baseKey.slice(COMBO_KEY_PREFIX.length) : baseKey;
    const item = (isCombo ? combos : products).find((i) => i.id === id);
    return item
      ? [
          {
            key,
            qty,
            baseKey,
            selection,
            id,
            item,
            kind: isCombo ? "combo" : "product",
          } as const,
        ]
      : [];
  });

  // Las promos de item se calculan sobre la cantidad total del item,
  // sumando sus líneas con distinta salsa.
  const totalQty = new Map<string, number>();
  for (const e of entries) {
    totalQty.set(e.baseKey, (totalQty.get(e.baseKey) ?? 0) + e.qty);
  }
  const promoApplied = new Set<string>();

  for (const { key, qty, baseKey, selection, id, item, kind } of entries) {
    let saving = 0;
    let promotionName: string | undefined;
    if (!promoApplied.has(baseKey)) {
      promoApplied.add(baseKey);
      const best = pickBest(
        active.flatMap((promo) =>
          promo.scope === "item" &&
          promo.target.kind === kind &&
          promo.target.id === id
            ? [
                {
                  promo,
                  saving: lineSaving(
                    promo.discount,
                    item.price,
                    totalQty.get(baseKey) ?? qty,
                  ),
                },
              ]
            : [],
        ),
      );
      saving = best?.saving ?? 0;
      promotionName = best?.promo.name;
    }

    const sauceInfo = selection && {
      included: selection.included.map(
        (sid) => sauces.find((s) => s.id === sid)?.name ?? MISSING_SAUCE_NAME,
      ),
      extra: selection.extra.map((sid) => {
        const sauce = sauces.find((s) => s.id === sid);
        return {
          name: sauce?.name ?? MISSING_SAUCE_NAME,
          price: sauce?.extraPrice ?? 0,
        };
      }),
    };
    const extrasUnit = sauceInfo
      ? sauceInfo.extra.reduce((sum, e) => sum + e.price, 0)
      : 0;

    lines.push({
      key,
      name: item.name,
      qty,
      unitPrice: item.price,
      gross: item.price * qty,
      saving,
      promotionName,
      ...(sauceInfo && { sauces: sauceInfo }),
      extras: extrasUnit * qty,
    });
  }

  const subtotal = lines.reduce(
    (sum, l) => sum + l.gross - l.saving + l.extras,
    0,
  );

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
