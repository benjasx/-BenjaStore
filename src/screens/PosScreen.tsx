import { useState } from "react";
import { BottomNav, type NavTab } from "@/components/BottomNav";
import { Header, Screen } from "@/components/Screen";
import { CartPanel } from "@/components/CartPanel";
import { ErrorBanner, ProductsSkeleton } from "@/components/ProductsState";
import { DEFAULT_PRODUCT_IMAGE, money, type Product } from "@/data/mock";
import type { Category } from "@/hooks/useCategories";
import { useIsDesktop } from "@/hooks/useIsDesktop";

interface Props {
  products: Product[];
  categories: Category[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  cart: Record<string, number>;
  onAdd: (id: string) => void;
  onChangeQty: (id: string, delta: number) => void;
  onClear: () => void;
  onConfirm: () => void;
  onCheckout: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const PosScreen = ({
  products,
  categories,
  loading,
  error,
  onRetry,
  cart,
  onAdd,
  onChangeQty,
  onClear,
  onConfirm,
  onCheckout,
  onNavigate,
}: Props) => {
  const desktop = useIsDesktop();
  const [categoryId, setCategoryId] = useState("");
  const enabled = categories.filter(
    (c) =>
      c.enabled && products.some((p) => p.categoryId === c.id && !p.soldOut),
  );
  const category = enabled.find((c) => c.id === categoryId) ?? enabled[0];
  const visible = products.filter((p) => p.categoryId === category?.id);
  const items = Object.entries(cart);
  const count = items.reduce((sum, [, qty]) => sum + qty, 0);
  const total = items.reduce(
    (sum, [id, qty]) =>
      sum + (products.find((p) => p.id === id)?.price ?? 0) * qty,
    0,
  );

  return (
    <Screen className="h-dvh lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header
          title="Nueva venta"
          subtitle="Luis · turno desde 14:02"
          action={
            <div className="bg-surface mr-5 flex h-11 items-center gap-2 rounded-full px-3.5 text-[15px] font-bold">
              <span className="bg-ok size-2.5 rounded-full" />
              LU
            </div>
          }
        />
        <div className="flex gap-2 overflow-x-auto px-5 pb-3.5">
          {enabled.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`h-11 shrink-0 rounded-full px-[18px] text-base uppercase ${
                c.id === category?.id
                  ? "bg-chili font-extrabold"
                  : "bg-surface text-sand font-semibold"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        {error && <ErrorBanner onRetry={onRetry} />}
        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto px-5 lg:grid-cols-3">
          {loading && <ProductsSkeleton rows={6} />}
          {!loading && !error && !category && (
            <p className="text-muted col-span-full py-6 text-[15px]">
              No hay categorías con productos disponibles. Revisa Más → Menú.
            </p>
          )}
          {!loading && !error && category && visible.length === 0 && (
            <p className="text-muted col-span-full py-6 text-[15px]">
              Sin productos en{" "}
              <span className="uppercase">{category.name}</span>.
            </p>
          )}
          {visible.map((p) => {
            const qty = cart[p.id] ?? 0;
            return (
              <button
                key={p.id}
                type="button"
                disabled={p.soldOut}
                onClick={() => onAdd(p.id)}
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
            cart={cart}
            onChangeQty={onChangeQty}
            onClear={onClear}
            onConfirm={onConfirm}
          />
        </aside>
      )}
      <BottomNav active="pos" onChange={onNavigate} />
    </Screen>
  );
};
