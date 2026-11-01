import { useState } from "react";
import { BottomNav, type NavTab } from "@/components/BottomNav";
import { CategoryEditor } from "@/components/CategoryEditor";
import { ComboEditor } from "@/components/ComboEditor";
import { ProductEditor, type ProductChanges } from "@/components/ProductEditor";
import { PromotionEditor } from "@/components/PromotionEditor";
import { ErrorBanner, ProductsSkeleton } from "@/components/ProductsState";
import { Header, Screen } from "@/components/Screen";
import { Toggle } from "@/components/Toggle";
import { DEFAULT_PRODUCT_IMAGE, money, type Product } from "@/data/mock";
import type { Category } from "@/hooks/useCategories";
import {
  comboContents,
  isComboSoldOut,
  type Combo,
  type ComboInput,
} from "@/hooks/useCombos";
import type { Promotion, PromotionInput } from "@/hooks/usePromotions";

interface Props {
  products: Product[];
  categories: Category[];
  combos: Combo[];
  onCreateCombo: (input: ComboInput) => void;
  onUpdateCombo: (id: string, input: ComboInput) => void;
  onDeleteCombo: (id: string) => void;
  onToggleCombo: (id: string, enabled: boolean) => void;
  promotions: Promotion[];
  onCreatePromotion: (input: PromotionInput) => void;
  onUpdatePromotion: (id: string, input: PromotionInput) => void;
  onDeletePromotion: (id: string) => void;
  onTogglePromotion: (id: string, enabled: boolean) => void;
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

const manage =
  "text-gold border-gold/50 h-11 rounded-xl border-[1.5px] border-dashed px-4 text-base font-bold";

export const MenuAdminScreen = ({
  products,
  categories,
  combos,
  onCreateCombo,
  onUpdateCombo,
  onDeleteCombo,
  onToggleCombo,
  promotions,
  onCreatePromotion,
  onUpdatePromotion,
  onDeletePromotion,
  onTogglePromotion,
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
  const [combosTab, setCombosTab] = useState(false);
  const [editingCategories, setEditingCategories] = useState(false);
  const [editingCombos, setEditingCombos] = useState(false);
  const [editingPromotions, setEditingPromotions] = useState(false);
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
      <div className="grid grid-cols-3 gap-2 px-5 pb-3 sm:grid-cols-6">
        {categories.map((c) => {
          const count = products.filter((p) => p.categoryId === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategoryId(c.id);
                setCombosTab(false);
              }}
              className={`h-11 min-w-0 truncate rounded-full px-2 text-sm uppercase ${
                !combosTab && c.id === category?.id
                  ? "bg-chili font-extrabold"
                  : "bg-surface text-sand font-semibold"
              } ${c.enabled ? "" : "opacity-50"}`}
            >
              {c.name}
              {count > 0 && ` · ${count}`}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCombosTab(true)}
          className={`h-11 min-w-0 truncate rounded-full px-2 text-sm uppercase ${
            combosTab
              ? "bg-chili font-extrabold"
              : "bg-surface text-sand font-semibold"
          }`}
        >
          Combos
          {combos.length > 0 && ` · ${combos.length}`}
        </button>
      </div>
      <div className="flex gap-2 px-5 pb-3">
        <button
          type="button"
          onClick={() => setEditingCategories((v) => !v)}
          aria-expanded={editingCategories}
          className={`${manage} ${editingCategories ? "bg-gold/15" : ""}`}
        >
          {editingCategories ? "Cerrar categorías" : "Editar categorías"}
        </button>
        <button
          type="button"
          onClick={() => setEditingCombos((v) => !v)}
          aria-expanded={editingCombos}
          className={`${manage} ${editingCombos ? "bg-gold/15" : ""}`}
        >
          {editingCombos ? "Cerrar combos" : "Combos"}
        </button>
        <button
          type="button"
          onClick={() => setEditingPromotions((v) => !v)}
          aria-expanded={editingPromotions}
          className={`${manage} ${editingPromotions ? "bg-gold/15" : ""}`}
        >
          {editingPromotions ? "Cerrar promociones" : "Promociones"}
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
      {editingCombos && (
        <ComboEditor
          combos={combos}
          products={products}
          onCreate={onCreateCombo}
          onUpdate={onUpdateCombo}
          onDelete={onDeleteCombo}
          onToggle={onToggleCombo}
        />
      )}
      {editingPromotions && (
        <PromotionEditor
          promotions={promotions}
          products={products}
          combos={combos}
          onCreate={onCreatePromotion}
          onUpdate={onUpdatePromotion}
          onDelete={onDeletePromotion}
          onToggle={onTogglePromotion}
        />
      )}
      {error && <ErrorBanner onRetry={onRetry} />}
      <div className="flex flex-1 flex-col px-5 py-7">
        {loading && (
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-3">
            <ProductsSkeleton rows={4} />
          </div>
        )}
        {!loading && !error && combosTab && combos.length === 0 && (
          <p className="text-muted py-6 text-[15px]">
            Sin combos. Usa «Combos» para crear el primero.
          </p>
        )}
        {combosTab && (
          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-8 xl:grid-cols-3">
            {combos.map((c) => {
              const soldOut = isComboSoldOut(c, products);
              return (
                <div
                  key={c.id}
                  className={`border-line-soft flex min-h-19 items-center gap-3.5 border-b ${c.enabled ? "" : "opacity-50"}`}
                >
                  <img
                    src={c.image ?? DEFAULT_PRODUCT_IMAGE}
                    alt=""
                    className="size-13 shrink-0 rounded-xl object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={`text-[17px] font-extrabold uppercase ${soldOut ? "text-muted" : ""}`}
                    >
                      {c.name}
                    </span>
                    <span
                      className={`text-[15px] ${soldOut ? "text-salmon font-bold" : "text-muted"}`}
                    >
                      {soldOut ? "Agotado" : money(c.price)}
                    </span>
                    <span className="text-muted font-serif text-[13px] leading-snug italic">
                      {comboContents(c, products)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!loading && !error && !combosTab && !category && (
          <p className="text-muted py-6 text-[15px]">
            Sin categorías. Usa «Editar categorías» para crear la primera.
          </p>
        )}
        {!loading && !error && !combosTab && category && items.length === 0 && (
          <p className="text-muted py-6 text-[15px]">
            Sin productos en <span className="uppercase">{category.name}</span>.
          </p>
        )}
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-8 xl:grid-cols-3">
          {(combosTab ? [] : items).map((p) => (
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
                    className="size-4.5"
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
      </div>
      <BottomNav active="more" onChange={onNavigate} />
    </Screen>
  );
};
