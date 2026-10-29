import { useState } from "react";
import { BottomNav, type NavTab } from "@/components/BottomNav";
import { Header, Screen } from "@/components/Screen";
import { categories, money, type Category, type Product } from "@/data/mock";

interface Props {
  products: Product[];
  cart: Record<string, number>;
  onAdd: (id: string) => void;
  onCheckout: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const PosScreen = ({
  products,
  cart,
  onAdd,
  onCheckout,
  onNavigate,
}: Props) => {
  const [category, setCategory] = useState<Category>("Alitas");
  const items = Object.entries(cart);
  const count = items.reduce((sum, [, qty]) => sum + qty, 0);
  const total = items.reduce(
    (sum, [id, qty]) =>
      sum + (products.find((p) => p.id === id)?.price ?? 0) * qty,
    0,
  );

  return (
    <Screen className="h-dvh">
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
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`h-11 shrink-0 rounded-full px-[18px] text-base ${
              c === category
                ? "bg-chili font-extrabold"
                : "bg-surface text-sand font-semibold"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto px-5">
        {products
          .filter((p) => p.category === category)
          .map((p) => {
            const qty = cart[p.id] ?? 0;
            return (
              <button
                key={p.id}
                type="button"
                disabled={p.soldOut}
                onClick={() => onAdd(p.id)}
                className={`relative flex h-33 flex-col justify-between rounded-[18px] p-3.5 text-left ${
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
                {p.soldOut ? (
                  <span className="text-salmon text-sm font-extrabold tracking-wide">
                    AGOTADO
                  </span>
                ) : (
                  <span className="text-muted text-[15px] font-semibold">
                    {p.group}
                  </span>
                )}
                <span
                  className={`text-[26px] leading-none font-black tracking-tight ${p.soldOut ? "text-faint" : ""}`}
                >
                  {p.name}
                </span>
                <span
                  className={`text-xl font-extrabold tabular-nums ${p.soldOut ? "text-faint" : "text-gold"}`}
                >
                  {money(p.price)}
                </span>
              </button>
            );
          })}
      </div>
      {count > 0 && (
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
      <BottomNav active="pos" onChange={onNavigate} />
    </Screen>
  );
};
