import type { Product } from "@/data/mock";
import type { Category } from "@/hooks/useCategories";
import { isComboSoldOut, type Combo } from "@/hooks/useCombos";
import type { ImageMap } from "@/hooks/useImages";
import { isoDate } from "@/lib/reportPdf";

export interface AdvertisingBrand {
  name: string;
  phone: string;
  address: string;
  promoTitle: string;
}

export interface AdvertisingConfig {
  brand: AdvertisingBrand;
  promoComboIds: string[];
  menuProductIds: string[];
  productBannerId: string | null; // producto del banner individual
}

export const MAX_PROMO_COMBOS = 3;

// Tamaño fijo en px: el PNG sale igual en cualquier dispositivo.
export const PROMO_SIZE = { width: 1080, height: 1440 } as const; // 3:4
export const MENU_SIZE = { width: 1600, height: 900 } as const; // 16:9
export const PRODUCT_SIZE = { width: 1080, height: 1080 } as const; // 1:1

export const DEFAULT_ADVERTISING: AdvertisingConfig = {
  brand: {
    name: "Doble Tentación",
    phone: "81 4973 6481",
    address: "Villas del Prado #127",
    promoTitle: "",
  },
  promoComboIds: [],
  menuProductIds: [],
  productBannerId: null,
};

const text = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

const ids = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];

// Tolera documentos ausentes o malformados: lo inválido cae al valor por defecto.
export const parseAdvertising = (data: unknown): AdvertisingConfig => {
  if (!data || typeof data !== "object") return DEFAULT_ADVERTISING;
  const raw = data as Partial<Record<keyof AdvertisingConfig, unknown>>;
  const brand = (raw.brand ?? {}) as Partial<Record<string, unknown>>;
  const base = DEFAULT_ADVERTISING.brand;
  return {
    brand: {
      name: text(brand.name, base.name),
      phone: text(brand.phone, base.phone),
      address: text(brand.address, base.address),
      promoTitle: text(brand.promoTitle, base.promoTitle),
    },
    promoComboIds: ids(raw.promoComboIds).slice(0, MAX_PROMO_COMBOS),
    menuProductIds: ids(raw.menuProductIds),
    productBannerId:
      typeof raw.productBannerId === "string" ? raw.productBannerId : null,
  };
};

export interface PromoBlock {
  combo: Combo;
  image?: string;
}

export interface MenuBlock {
  category: Category;
  products: Product[];
}

// Los combos guardan `productId`; un combo está agotado si algún componente lo está (SPEC 04).
export const isComboAvailable = (combo: Combo, products: Product[]) =>
  combo.enabled && !isComboSoldOut(combo, products);

export const resolvePromo = (
  config: AdvertisingConfig,
  combos: Combo[],
  products: Product[],
  images: ImageMap,
): PromoBlock[] =>
  config.promoComboIds
    .map((id) => combos.find((c) => c.id === id))
    .filter((c): c is Combo => !!c && isComboAvailable(c, products))
    .slice(0, MAX_PROMO_COMBOS)
    .map((combo) => ({ combo, image: images[combo.id] }));

export interface ProductBlock {
  product: Product;
  image?: string;
}

// El producto debe existir, no estar agotado y ser de una categoría habilitada.
export const resolveProductBanner = (
  config: AdvertisingConfig,
  products: Product[],
  categories: Category[],
  images: ImageMap,
): ProductBlock | null => {
  const product = products.find((p) => p.id === config.productBannerId);
  if (!product || product.soldOut) return null;
  const category = categories.find((c) => c.id === product.categoryId);
  if (!category?.enabled) return null;
  return { product, image: images[product.id] };
};

export const resolveMenu = (
  config: AdvertisingConfig,
  products: Product[],
  categories: Category[],
): MenuBlock[] => {
  const chosen = config.menuProductIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p && !p.soldOut);
  return categories
    .filter((c) => c.enabled)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((category) => ({
      category,
      products: chosen.filter((p) => p.categoryId === category.id),
    }))
    .filter((block) => block.products.length > 0);
};

export const moveProduct = (
  ids: string[],
  productId: string,
  direction: -1 | 1,
  products: Product[],
): string[] => {
  const index = ids.indexOf(productId);
  const categoryId = products.find((p) => p.id === productId)?.categoryId;
  if (index === -1 || !categoryId) return ids;
  for (let i = index + direction; i >= 0 && i < ids.length; i += direction) {
    if (products.find((p) => p.id === ids[i])?.categoryId !== categoryId)
      continue;
    const next = [...ids];
    [next[index], next[i]] = [next[i], next[index]];
    return next;
  }
  return ids;
};

// Mueve un id una posición dentro de la lista (combos de Promo).
export const moveItem = (
  ids: string[],
  id: string,
  direction: -1 | 1,
): string[] => {
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export const unavailableIds = (ids: string[], available: { id: string }[]) =>
  ids.filter((id) => !available.some((a) => a.id === id));

export const bannerFileName = (
  template: "promo" | "menu" | "product",
  date: Date,
  ext: "png" | "pdf",
) => `publicidad-${template}-${isoDate(date)}.${ext}`;

export const BRAND_LIMITS = {
  name: 40,
  phone: 20,
  address: 60,
  promoTitle: 30,
} as const;

export const validateBrand = (brand: AdvertisingBrand): string | null => {
  const name = brand.name.trim();
  if (!name) return "El nombre del negocio es obligatorio.";
  if (name.length > BRAND_LIMITS.name)
    return `El nombre admite hasta ${BRAND_LIMITS.name} caracteres.`;
  if (brand.phone.trim().length > BRAND_LIMITS.phone)
    return `El teléfono admite hasta ${BRAND_LIMITS.phone} caracteres.`;
  if (brand.address.trim().length > BRAND_LIMITS.address)
    return `La dirección admite hasta ${BRAND_LIMITS.address} caracteres.`;
  if (brand.promoTitle.trim().length > BRAND_LIMITS.promoTitle)
    return `El título admite hasta ${BRAND_LIMITS.promoTitle} caracteres.`;
  return null;
};
