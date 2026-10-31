import { useState } from "react";
import { BottomNav, type NavTab } from "@/components/BottomNav";
import { CategoryEditor } from "@/components/CategoryEditor";
import { ProductEditor, type ProductChanges } from "@/components/ProductEditor";
import { ErrorBanner, ProductsSkeleton } from "@/components/ProductsState";
import { Header, Screen } from "@/components/Screen";
import { Toggle } from "@/components/Toggle";
import { DEFAULT_PRODUCT_IMAGE, money, type Product } from "@/data/mock";
import type { Category } from "@/hooks/useCategories";

const modifierGroups = [
  { name: "Salsa", detail: "Elige 1 · gratis · 6 opciones" },
  { name: "Extras", detail: "Opcional · con costo · 5 opciones" },
];

interface Props {
  products: Product[];
  categories: Category[];
  onCreateCategory: (name: string) => void;
  onRenameCategory: (id: string, name: string) => void;
  onToggleCategory: (id: string, enabled: boolean) => void;
  onMoveCategory: (id: string, direction: -1 | 1) => void;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onToggleSoldOut: (id: string, soldOut: boolean) => void;
  onUpdateProduct: (id: string, changes: ProductChanges) => void;
  onDeleteProduct: (id: string) => void;
  onAddProduct: () => void;
  onBack: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const MenuAdminScreen = ({
  products,
  categories,
  onCreateCategory,
  onRenameCategory,
  onToggleCategory,
  onMoveCategory,
  loading,
  error,
  onRetry,
  onToggleSoldOut,
  onUpdateProduct,
  onDeleteProduct,
  onAddProduct,
  onBack,
  onNavigate,
}: Props) => {
  const [categoryId, setCategoryId] = useState("");
  const [editingCategories, setEditingCategories] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const category = categories.find((c) => c.id === categoryId) ?? categories[0];
  const items = products.filter((p) => p.categoryId === category?.id);

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
          const count = products.filter((p) => p.categoryId === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`h-11 shrink-0 rounded-full px-[18px] text-base uppercase ${
                c.id === category?.id
                  ? "bg-chili font-extrabold"
                  : "bg-surface text-sand font-semibold"
              } ${c.enabled ? "" : "opacity-50"}`}
            >
              {c.name}
              {count > 0 && ` · ${count}`}
            </button>
          );
        })}
      </div>
      <div className="px-5 pb-3">
        <button
          type="button"
          onClick={() => setEditingCategories((v) => !v)}
          aria-expanded={editingCategories}
          className="bg-surface text-sand h-11 rounded-xl px-4 text-base font-bold"
        >
          {editingCategories ? "Cerrar categorías" : "Editar categorías"}
        </button>
      </div>
      {editingCategories && (
        <CategoryEditor
          categories={categories}
          onCreate={onCreateCategory}
          onRename={onRenameCategory}
          onToggle={onToggleCategory}
          onMove={onMoveCategory}
        />
      )}
      {error && <ErrorBanner onRetry={onRetry} />}
      <div className="flex flex-1 flex-col px-5">
        {loading && (
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-3">
            <ProductsSkeleton rows={4} />
          </div>
        )}
        {!loading && !error && !category && (
          <p className="text-muted py-6 text-[15px]">
            Sin categorías. Usa «Editar categorías» para crear la primera.
          </p>
        )}
        {!loading && !error && category && items.length === 0 && (
          <p className="text-muted py-6 text-[15px]">
            Sin productos en <span className="uppercase">{category.name}</span>.
          </p>
        )}
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-8 xl:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="border-line-soft border-b">
              <div className="flex min-h-19 items-center gap-3.5">
                <img
                  src={p.image ?? DEFAULT_PRODUCT_IMAGE}
                  alt=""
                  className="size-13 shrink-0 rounded-xl object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={`text-[17px] font-extrabold uppercase ${p.soldOut ? "text-muted" : ""}`}
                  >
                    {p.name}
                  </span>
                  {(p.soldOut || p.price > 0) && (
                    <span
                      className={`text-[15px] ${p.soldOut ? "text-salmon font-bold" : "text-muted"}`}
                    >
                      {p.soldOut ? "Agotado hoy" : money(p.price)}
                    </span>
                  )}
                  {p.description && (
                    <span className="text-muted font-serif text-[13px] leading-snug italic">
                      {p.description}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Editar ${p.name}`}
                  onClick={() => setEditingProductId(p.id)}
                  className="text-muted grid size-11 shrink-0 place-items-center"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <Toggle
                  checked={!p.soldOut}
                  onChange={(v) => onToggleSoldOut(p.id, !v)}
                  label={`Disponible: ${p.name}`}
                />
              </div>
              {editingProductId === p.id && (
                <ProductEditor
                  product={p}
                  onSave={(changes) => {
                    onUpdateProduct(p.id, changes);
                    setEditingProductId(null);
                  }}
                  onDelete={() => {
                    onDeleteProduct(p.id);
                    setEditingProductId(null);
                  }}
                  onCancel={() => setEditingProductId(null)}
                />
              )}
            </div>
          ))}
        </div>
        <h2 className="text-muted mt-5.5 mb-2.5 text-[15px] font-bold">
          Grupos de modificadores
        </h2>
        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 xl:grid-cols-3">
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
