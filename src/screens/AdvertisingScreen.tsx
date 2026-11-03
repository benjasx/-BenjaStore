import { useEffect, useRef, useState, type ReactNode } from "react";
import { MenuBanner } from "@/components/MenuBanner";
import { ProductBanner } from "@/components/ProductBanner";
import { PromoBanner } from "@/components/PromoBanner";
import { ErrorBanner, ProductsSkeleton } from "@/components/ProductsState";
import { Header, Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { money, type Product } from "@/data/mock";
import type { Category } from "@/hooks/useCategories";
import type { Combo } from "@/hooks/useCombos";
import type { ImageMap } from "@/hooks/useImages";
import type { Sauce } from "@/hooks/useSauces";
import { useAdvertising } from "@/hooks/useAdvertising";
import {
  MAX_PROMO_COMBOS,
  MENU_SIZE,
  PRODUCT_SIZE,
  PROMO_SIZE,
  isComboAvailable,
  moveItem,
  moveProduct,
  resolveMenu,
  resolveProductBanner,
  resolvePromo,
  unavailableIds,
  validateBrand,
  type AdvertisingBrand,
  type AdvertisingConfig,
} from "@/lib/advertising";
import { downloadBannerPdf, downloadBannerPng } from "@/lib/bannerExport";

interface Props {
  products: Product[];
  categories: Category[];
  combos: Combo[];
  sauces: Sauce[];
  images: ImageMap;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onBack: () => void;
}

const TEMPLATES = ["Promo", "Menú", "Producto"] as const;
type Template = (typeof TEMPLATES)[number];

const field =
  "bg-surface border-line focus:border-gold h-12 w-full rounded-[14px] border-[1.5px] px-3.5 text-base outline-none";

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-2">
    <h2 className="text-muted text-[15px] font-bold">{title}</h2>
    {children}
  </section>
);

interface RowProps {
  label: string;
  note?: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onUp?: () => void;
  onDown?: () => void;
}

const Row = ({
  label,
  note,
  checked,
  disabled,
  onToggle,
  onUp,
  onDown,
}: RowProps) => (
  <div className="border-line-soft flex min-h-12 items-center gap-2 border-b">
    <label className="flex min-w-0 flex-1 items-center gap-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="accent-gold size-5 shrink-0"
      />
      <span
        className={`min-w-0 flex-1 truncate text-base font-bold uppercase ${
          disabled && !checked ? "text-faint" : ""
        }`}
      >
        {label}
      </span>
      {note && <span className="text-muted shrink-0 text-sm">{note}</span>}
    </label>
    {checked && (
      <>
        <button
          type="button"
          aria-label={`Subir ${label}`}
          disabled={!onUp}
          onClick={onUp}
          className="grid size-11 place-items-center text-lg disabled:opacity-30"
        >
          ↑
        </button>
        <button
          type="button"
          aria-label={`Bajar ${label}`}
          disabled={!onDown}
          onClick={onDown}
          className="grid size-11 place-items-center text-lg disabled:opacity-30"
        >
          ↓
        </button>
      </>
    )}
  </div>
);

const Missing = ({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) => (
  <div className="border-line-soft flex min-h-12 items-center gap-2 border-b">
    <span className="text-muted min-w-0 flex-1 truncate text-base uppercase">
      {label}
    </span>
    <span className="text-salmon shrink-0 text-sm font-bold">
      No disponible
    </span>
    <button
      type="button"
      aria-label={`Quitar ${label}`}
      onClick={onRemove}
      className="text-gold h-11 shrink-0 px-3 text-base font-extrabold"
    >
      Quitar
    </button>
  </div>
);

// Escala el banner de tamaño fijo al ancho disponible (el PNG no se ve afectado).
const ScaledPreview = ({
  size,
  children,
}: {
  size: { width: number; height: number };
  children: ReactNode;
}) => {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = width > 0 ? width / size.width : 0;
  return (
    <div
      ref={box}
      data-testid="banner-preview"
      className="w-full overflow-hidden rounded-[14px]"
      style={{ height: size.height * scale }}
    >
      <div
        style={{
          width: size.width,
          height: size.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const AdvertisingScreen = ({
  products,
  categories,
  combos,
  sauces,
  images,
  loading: catalogLoading,
  error: catalogError,
  onRetry,
  onBack,
}: Props) => {
  const remote = useAdvertising();
  const [template, setTemplate] = useState<Template>("Promo");
  const [draft, setDraft] = useState<AdvertisingConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const [exportFailed, setExportFailed] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  const config = draft ?? remote.config;
  const loading = catalogLoading || remote.loading;
  const error = catalogError ?? remote.error;
  const retry = () => {
    if (catalogError) onRetry();
    if (remote.error) remote.retry();
  };

  const edit = (changes: Partial<AdvertisingConfig>) => {
    setSaveError(null);
    setDraft({ ...config, ...changes });
  };
  const editBrand = (changes: Partial<AdvertisingBrand>) =>
    edit({ brand: { ...config.brand, ...changes } });

  const brandError = validateBrand(config.brand);
  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await remote.save(config);
      setDraft(null);
    } catch (e) {
      console.error(e);
      setSaveError(
        e instanceof Error
          ? e.message
          : "No se pudo guardar. Inténtalo de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  const availableCombos = combos.filter((c) => isComboAvailable(c, products));
  const enabledCategories = categories
    .filter((c) => c.enabled)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const enabledIds = new Set(enabledCategories.map((c) => c.id));
  const availableProducts = products.filter(
    (p) => !p.soldOut && enabledIds.has(p.categoryId),
  );

  const promo = resolvePromo(config, combos, products, images);
  const menu = resolveMenu(config, products, categories);
  const single = resolveProductBanner(config, products, categories, images);
  const enabledSauces = sauces.filter((s) => s.enabled);

  const toggleCombo = (id: string) => {
    const ids = config.promoComboIds;
    edit({
      promoComboIds: ids.includes(id)
        ? ids.filter((x) => x !== id)
        : ids.length < MAX_PROMO_COMBOS
          ? [...ids, id]
          : ids,
    });
  };
  const toggleProduct = (id: string) => {
    const ids = config.menuProductIds;
    edit({
      menuProductIds: ids.includes(id)
        ? ids.filter((x) => x !== id)
        : [...ids, id],
    });
  };

  const promoSelection = (
    <Section
      title={`Combos (${config.promoComboIds.length}/${MAX_PROMO_COMBOS})`}
    >
      {combos.length === 0 ? (
        <p className="text-muted text-[15px]">
          No hay combos registrados. Crea uno en Menú.
        </p>
      ) : (
        <>
          {unavailableIds(config.promoComboIds, availableCombos).map((id) => (
            <Missing
              key={id}
              label={combos.find((c) => c.id === id)?.name ?? "Combo eliminado"}
              onRemove={() => toggleCombo(id)}
            />
          ))}
          {[
            ...config.promoComboIds
              .map((id) => availableCombos.find((c) => c.id === id))
              .filter((c): c is Combo => !!c),
            ...availableCombos.filter(
              (c) => !config.promoComboIds.includes(c.id),
            ),
          ].map((c) => {
            const ids = config.promoComboIds;
            const chosen = ids.includes(c.id);
            const up = moveItem(ids, c.id, -1);
            const down = moveItem(ids, c.id, 1);
            return (
              <Row
                key={c.id}
                label={c.name}
                note={money(c.price)}
                checked={chosen}
                disabled={!chosen && ids.length >= MAX_PROMO_COMBOS}
                onToggle={() => toggleCombo(c.id)}
                onUp={
                  up !== ids ? () => edit({ promoComboIds: up }) : undefined
                }
                onDown={
                  down !== ids ? () => edit({ promoComboIds: down }) : undefined
                }
              />
            );
          })}
        </>
      )}
    </Section>
  );

  const productSelection = (
    <Section title="Producto">
      {products.length === 0 ? (
        <p className="text-muted text-[15px]">No hay productos registrados.</p>
      ) : (
        <>
          {config.productBannerId && !single && (
            <Missing
              label={
                products.find((p) => p.id === config.productBannerId)?.name ??
                "Producto eliminado"
              }
              onRemove={() => edit({ productBannerId: null })}
            />
          )}
          <select
            aria-label="Producto del banner"
            value={single?.product.id ?? ""}
            onChange={(e) => edit({ productBannerId: e.target.value || null })}
            className={field}
          >
            <option value="">Elige un producto</option>
            {enabledCategories.map((category) => {
              const inCategory = availableProducts.filter(
                (p) => p.categoryId === category.id,
              );
              return inCategory.length === 0 ? null : (
                <optgroup key={category.id} label={category.name}>
                  {inCategory.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {money(p.price)}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </>
      )}
    </Section>
  );

  const menuSelection = (
    <Section title="Productos">
      {products.length === 0 ? (
        <p className="text-muted text-[15px]">No hay productos registrados.</p>
      ) : (
        <>
          {unavailableIds(config.menuProductIds, availableProducts).map(
            (id) => (
              <Missing
                key={id}
                label={
                  products.find((p) => p.id === id)?.name ??
                  "Producto eliminado"
                }
                onRemove={() => toggleProduct(id)}
              />
            ),
          )}
          {enabledCategories.map((category) => {
            const inCategory = availableProducts.filter(
              (p) => p.categoryId === category.id,
            );
            if (inCategory.length === 0) return null;
            const ids = config.menuProductIds;
            const chosen = ids
              .map((id) => inCategory.find((p) => p.id === id))
              .filter((p): p is Product => !!p);
            const rest = inCategory.filter((p) => !ids.includes(p.id));
            return (
              <div key={category.id} className="mb-2 flex flex-col">
                <h3 className="text-gold mt-2 text-sm font-extrabold uppercase">
                  {category.name}
                </h3>
                {[...chosen, ...rest].map((p) => {
                  const isChosen = ids.includes(p.id);
                  const up = moveProduct(ids, p.id, -1, products);
                  const down = moveProduct(ids, p.id, 1, products);
                  return (
                    <Row
                      key={p.id}
                      label={p.name}
                      note={money(p.price)}
                      checked={isChosen}
                      onToggle={() => toggleProduct(p.id)}
                      onUp={
                        up !== ids
                          ? () => edit({ menuProductIds: up })
                          : undefined
                      }
                      onDown={
                        down !== ids
                          ? () => edit({ menuProductIds: down })
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            );
          })}
        </>
      )}
    </Section>
  );

  const hasContent =
    template === "Promo"
      ? promo.length > 0
      : template === "Menú"
        ? menu.length > 0
        : !!single;
  const templateKey =
    template === "Promo" ? "promo" : template === "Menú" ? "menu" : "product";

  const canExport = !loading && !error && hasContent && !exporting;

  const exportBanner = async (kind: "png" | "pdf") => {
    const node = bannerRef.current;
    if (!node) return;
    setExporting(kind);
    setExportFailed(false);
    try {
      const name = templateKey;
      if (kind === "png") await downloadBannerPng(node, name);
      else await downloadBannerPdf(node, name);
    } catch (e) {
      console.error(e);
      setExportFailed(true);
    } finally {
      setExporting(null);
    }
  };

  return (
    <Screen className="lg:max-w-[1200px]">
      <Header
        title="Publicidad"
        onBack={onBack}
        action={
          <button
            type="button"
            disabled={!draft || !!brandError || saving}
            onClick={save}
            className="bg-gold text-ink mr-5 h-11 rounded-xl px-4 text-base font-extrabold disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        }
      />
      {exportFailed && (
        <p role="alert" className="text-salmon px-5 pb-3 text-[15px] font-bold">
          No se pudo generar el archivo. Inténtalo de nuevo.
        </p>
      )}
      {error && (
        <ErrorBanner
          onRetry={retry}
          message="No se pudo cargar la información de publicidad."
        />
      )}
      <div className="flex flex-1 flex-col gap-5 px-5 pb-8 lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-8">
        {loading && !error ? (
          <div className="flex flex-col gap-3.5 lg:col-span-2">
            <ProductsSkeleton rows={4} />
          </div>
        ) : (
          !error && (
            <>
              <div className="flex flex-col gap-5">
                <Segmented
                  options={TEMPLATES}
                  value={template}
                  onChange={setTemplate}
                />
                <Section title="Marca">
                  <input
                    aria-label="Nombre del negocio"
                    value={config.brand.name}
                    onChange={(e) => editBrand({ name: e.target.value })}
                    className={field}
                  />
                  <input
                    aria-label="Teléfono"
                    value={config.brand.phone}
                    onChange={(e) => editBrand({ phone: e.target.value })}
                    className={field}
                  />
                  <input
                    aria-label="Dirección"
                    value={config.brand.address}
                    onChange={(e) => editBrand({ address: e.target.value })}
                    className={field}
                  />
                  {template === "Promo" && (
                    <input
                      aria-label="Título del banner"
                      placeholder="Título del banner (opcional)"
                      value={config.brand.promoTitle}
                      onChange={(e) =>
                        editBrand({ promoTitle: e.target.value })
                      }
                      className={field}
                    />
                  )}
                  {brandError && (
                    <p
                      role="alert"
                      className="text-salmon text-[15px] font-bold"
                    >
                      {brandError}
                    </p>
                  )}
                </Section>
                {saveError && !brandError && (
                  <p role="alert" className="text-salmon text-[15px] font-bold">
                    {saveError}
                  </p>
                )}
                {template === "Promo"
                  ? promoSelection
                  : template === "Menú"
                    ? menuSelection
                    : productSelection}
              </div>
              <div className="flex flex-col gap-3 lg:sticky lg:top-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-muted text-[15px] font-bold">
                    Vista previa
                  </h2>
                  <div className="flex gap-2">
                    {(
                      [
                        ["png", "PNG"],
                        ["pdf", "PDF"],
                      ] as const
                    ).map(([kind, label]) => (
                      <button
                        key={kind}
                        type="button"
                        disabled={!canExport}
                        onClick={() => exportBanner(kind)}
                        className="bg-gold text-ink h-11 rounded-xl px-4 text-base font-extrabold disabled:opacity-40"
                      >
                        {exporting === kind ? "Generando…" : label}
                      </button>
                    ))}
                  </div>
                </div>
                {hasContent ? (
                  <ScaledPreview
                    size={
                      template === "Promo"
                        ? PROMO_SIZE
                        : template === "Menú"
                          ? MENU_SIZE
                          : PRODUCT_SIZE
                    }
                  >
                    {template === "Promo" ? (
                      <PromoBanner
                        ref={bannerRef}
                        brand={config.brand}
                        blocks={promo}
                        products={products}
                      />
                    ) : template === "Menú" ? (
                      <MenuBanner
                        ref={bannerRef}
                        brand={config.brand}
                        blocks={menu}
                        sauces={enabledSauces}
                      />
                    ) : (
                      single && (
                        <ProductBanner
                          ref={bannerRef}
                          brand={config.brand}
                          block={single}
                        />
                      )
                    )}
                  </ScaledPreview>
                ) : (
                  <p className="text-muted text-[15px]">
                    {template === "Promo"
                      ? "Elige al menos un combo para ver el banner."
                      : template === "Menú"
                        ? "Elige al menos un producto para ver el banner."
                        : "Elige un producto para ver el banner."}
                  </p>
                )}
              </div>
            </>
          )
        )}
      </div>
    </Screen>
  );
};
