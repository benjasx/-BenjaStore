import { useState } from "react";
import { BottomNav, type NavTab } from "@/components/BottomNav";
import { Header, Screen } from "@/components/Screen";
import { Toggle } from "@/components/Toggle";
import { categories, money, type Category, type Product } from "@/data/mock";

const modifierGroups = [
  { name: "Salsa", detail: "Elige 1 · gratis · 6 opciones" },
  { name: "Extras", detail: "Opcional · con costo · 5 opciones" },
];

interface Props {
  products: Product[];
  onToggleSoldOut: (id: string, soldOut: boolean) => void;
  onAddProduct: () => void;
  onBack: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const MenuAdminScreen = ({
  products,
  onToggleSoldOut,
  onAddProduct,
  onBack,
  onNavigate,
}: Props) => {
  const [category, setCategory] = useState<Category>("Alitas");
  const items = products.filter((p) => p.category === category);

  return (
    <Screen>
      <Header
        title="Menú"
        onBack={onBack}
        action={
          <button
            type="button"
            onClick={onAddProduct}
            className="bg-gold text-ink mr-2 h-11 rounded-xl px-4 text-base font-extrabold"
          >
            + Producto
          </button>
        }
      />
      <div className="flex gap-2 overflow-x-auto px-5 pb-3">
        {categories.map((c) => {
          const count = products.filter((p) => p.category === c).length;
          return (
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
              {count > 0 && ` · ${count}`}
            </button>
          );
        })}
      </div>
      <div className="flex flex-1 flex-col px-5">
        {items.length === 0 && (
          <p className="text-muted py-6 text-[15px]">
            Sin productos en {category}.
          </p>
        )}
        {items.map((p) => (
          <div
            key={p.id}
            className="border-line-soft flex min-h-19 items-center gap-3.5 border-b"
          >
            <div className="text-faint grid size-13 place-items-center rounded-xl bg-[repeating-linear-gradient(45deg,#2d2420_0_5px,#221a17_5px_10px)] font-mono text-[10px]">
              foto
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span
                className={`text-[17px] font-extrabold ${p.soldOut ? "text-muted" : ""}`}
              >
                {p.name}
              </span>
              <span
                className={`text-[15px] ${p.soldOut ? "text-salmon font-bold" : "text-muted"}`}
              >
                {p.soldOut ? "Agotado hoy" : `${money(p.price)} · ${p.group}`}
              </span>
            </div>
            <Toggle
              checked={!p.soldOut}
              onChange={(v) => onToggleSoldOut(p.id, !v)}
              label={`Disponible: ${p.name}`}
            />
          </div>
        ))}
        <h2 className="text-muted mt-5.5 mb-2.5 text-[15px] font-bold">
          Grupos de modificadores
        </h2>
        <div className="flex flex-col gap-2.5">
          {modifierGroups.map((g) => (
            <button
              key={g.name}
              type="button"
              className="bg-surface flex min-h-16 items-center justify-between rounded-[14px] px-4 py-3 text-left"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-[17px] font-extrabold">{g.name}</span>
                <span className="text-muted text-[15px]">{g.detail}</span>
              </span>
              <span className="text-muted text-xl">›</span>
            </button>
          ))}
        </div>
      </div>
      <BottomNav active="more" onChange={onNavigate} />
    </Screen>
  );
};
