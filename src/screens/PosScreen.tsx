import { useState } from "react";
import { BottomNav, type NavTab } from "@/components/BottomNav";
import { Header, Screen } from "@/components/Screen";
import { CartPanel } from "@/components/CartPanel";
import { ErrorBanner, ProductsSkeleton } from "@/components/ProductsState";
import { SauceSheet } from "@/components/SauceSheet";
import {
  DEFAULT_PRODUCT_IMAGE,
  money,
  type Product,
  type User,
} from "@/data/mock";
import type { Category } from "@/hooks/useCategories";
import { isComboSoldOut, type Combo } from "@/hooks/useCombos";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import type { Promotion } from "@/hooks/usePromotions";
import type { Sauce } from "@/hooks/useSauces";
import {
  comboKey,
  computeCart,
  lineKey,
  parseLineKey,
  type SauceSelection,
} from "@/lib/pricing";
import type { SaleData } from "@/lib/sales";

interface Props {
  products: Product[];
  categories: Category[];
  combos: Combo[];
  promotions: Promotion[];
  sauces: Sauce[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  cart: Record<string, number>;
  onAdd: (id: string) => void;
  onChangeQty: (id: string, delta: number) => void;
  onClear: () => void;
  onConfirm: (sale: SaleData) => Promise<void>;
  seller: User | null;
  shiftStart: Date | null;
  onCheckout: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const PosScreen = ({
  products,
  categories,
  combos,
  promotions,
  sauces,
  loading,
  error,
  onRetry,
  cart,
  onAdd,
  onChangeQty,
  onClear,
  onConfirm,
  seller,
  shiftStart,
  onCheckout,
  onNavigate,
}: Props) => {
  const desktop = useIsDesktop();
  const [categoryId, setCategoryId] = useState("");
  const [combosTab, setCombosTab] = useState(false);
  const enabled = categories.filter(
    (c) =>
      c.enabled && products.some((p) => p.categoryId === c.id && !p.soldOut),
  );
  const category = enabled.find((c) => c.id === categoryId) ?? enabled[0];
  const enabledCombos = combos.filter((c) => c.enabled);
  const showCombos = enabledCombos.length > 0 && (combosTab || !category);
  const visible = showCombos
    ? enabledCombos.map((c) => ({
        ...c,
        id: comboKey(c.id),
        soldOut: isComboSoldOut(c, products),
        sauceSlots: c.sauceCount ?? 0,
      }))
    : products
        .filter((p) => p.categoryId === category?.id)
        .map((p) => ({ ...p, sauceSlots: p.usesSauces ? 1 : 0 }));
  const items = Object.entries(cart);
  const count = items.reduce((sum, [, qty]) => sum + qty, 0);
  const { total } = computeCart(cart, products, combos, promotions, sauces);
  const enabledSauces = sauces.filter((s) => s.enabled);
  const [picking, setPicking] = useState<{
    id: string;
    name: string;
    slots: number;
  } | null>(null);
  const qtyOf = (baseKey: string) =>
    items.reduce(
      (sum, [key, qty]) =>
        parseLineKey(key).baseKey === baseKey ? sum + qty : sum,
      0,
    );
  const addSelection = (selection: SauceSelection) => {
    if (picking) onAdd(lineKey(picking.id, selection));
    setPicking(null);
  };

  return (
    <Screen className="h-dvh lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header
          title="Nueva venta"
          subtitle={
            seller
              ? `${seller.name} · turno desde ${(shiftStart ?? new Date()).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })}`
              : "Sin turno"
          }
          action={
            <div className="bg-surface mr-5 flex h-11 items-center gap-2 rounded-full px-3.5 text-[15px] font-bold">
              <span className="bg-ok size-2.5 rounded-full" />
              {seller?.initials ?? "—"}
            </div>
          }
        />
        <div className="grid grid-cols-3 gap-2 px-5 pb-3.5 sm:grid-cols-6">
          {enabled.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategoryId(c.id);
                setCombosTab(false);
              }}
              className={`h-11 min-w-0 truncate rounded-full px-2 text-sm uppercase ${
                !showCombos && c.id === category?.id
                  ? "bg-chili font-extrabold"
                  : "bg-surface text-sand font-semibold"
              }`}
            >
              {c.name}
            </button>
          ))}
          {enabledCombos.length > 0 && (
            <button
              type="button"
              onClick={() => setCombosTab(true)}
              className={`h-11 min-w-0 truncate rounded-full px-2 text-sm uppercase ${
                showCombos
                  ? "bg-chili font-extrabold"
                  : "bg-surface text-sand font-semibold"
              }`}
            >
              Combos
            </button>
          )}
        </div>
        {error && <ErrorBanner onRetry={onRetry} />}
        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto px-5 lg:grid-cols-3">
          {loading && <ProductsSkeleton rows={6} />}
          {!loading && !error && !category && !showCombos && (
            <p className="text-muted col-span-full py-6 text-[15px]">
              No hay categorías con productos disponibles. Revisa Más → Menú.
            </p>
          )}
          {!loading &&
            !error &&
            !showCombos &&
            category &&
            visible.length === 0 && (
              <p className="text-muted col-span-full py-6 text-[15px]">
                Sin productos en{" "}
                <span className="uppercase">{category.name}</span>.
              </p>
            )}
          {visible.map((p) => {
            const qty = qtyOf(p.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={p.soldOut}
                onClick={() =>
                  p.sauceSlots > 0 && enabledSauces.length > 0
                    ? setPicking({
                        id: p.id,
                        name: p.name,
                        slots: p.sauceSlots,
                      })
                    : onAdd(p.id)
                }
                className={`relative flex min-h-33 flex-col justify-between gap-1.5 rounded-[18px] p-3.5 text-left ${
                  p.soldOut
                    ? "border-line border-[1.5px] border-dashed bg-[#1c1513]"
                    : qty > 0
                      ? "border-gold bg-surface border-2"
                      : "bg-surface"
                }`}
              >
                {qty > 0 && (
                  <span className="bg-gold text-ink absolute -top-px -right-px flex h-8 min-w-10 items-center justify-center rounded-tr-2xl rounded-bl-xl px-2.5 text-base font-black">
                    ×{qty}
                  </span>
                )}
                <img
                  src={p.image ?? DEFAULT_PRODUCT_IMAGE}
                  alt=""
                  className={`h-24 w-full rounded-xl object-cover ${p.soldOut ? "opacity-40" : ""}`}
                />
                {p.soldOut && (
                  <span className="text-salmon text-sm font-extrabold tracking-wide">
                    AGOTADO
                  </span>
                )}
                <span className="flex flex-col gap-1">
                  <span
                    className={`text-[26px] leading-none font-black tracking-tight uppercase ${p.soldOut ? "text-faint" : ""}`}
                  >
                    {p.name}
                  </span>
                  {p.description && (
                    <span
                      className={`font-serif text-[13px] leading-snug font-normal italic ${p.soldOut ? "text-faint" : "text-sand"}`}
                    >
                      {p.description}
                    </span>
                  )}
                </span>
                {p.price > 0 && (
                  <span
                    className={`text-xl font-extrabold tabular-nums ${p.soldOut ? "text-faint" : "text-gold"}`}
                  >
                    {money(p.price)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!desktop && count > 0 && (
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={onCheckout}
              className="bg-chili flex h-16 w-full items-center justify-between rounded-[18px] pr-2 pl-5"
            >
              <span className="flex flex-col text-left">
                <span className="text-sm font-semibold text-[#ffd9d2]">
                  {count} {count === 1 ? "producto" : "productos"}
                </span>
                <span className="text-[22px] font-black tabular-nums">
                  {money(total)}
                </span>
              </span>
              <span className="bg-cream text-ink flex h-12 items-center rounded-xl px-[22px] text-lg font-black">
                Cobrar
              </span>
            </button>
          </div>
        )}
      </div>
      {desktop && (
        <aside className="border-line-soft flex w-96 shrink-0 flex-col border-l">
          <CartPanel
            products={products}
            combos={combos}
            promotions={promotions}
            sauces={sauces}
            cart={cart}
            onChangeQty={onChangeQty}
            onClear={onClear}
            onConfirm={onConfirm}
          />
        </aside>
      )}
      {picking && (
        <SauceSheet
          name={picking.name}
          slots={picking.slots}
          sauces={enabledSauces}
          onClose={() => setPicking(null)}
          onConfirm={addSelection}
        />
      )}
      <BottomNav active="pos" onChange={onNavigate} />
    </Screen>
  );
};
