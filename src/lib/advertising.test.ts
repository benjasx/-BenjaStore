import type { Product } from "@/data/mock";
import type { Category } from "@/hooks/useCategories";
import type { Combo } from "@/hooks/useCombos";
import {
  DEFAULT_ADVERTISING,
  bannerFileName,
  moveItem,
  moveProduct,
  parseAdvertising,
  resolveMenu,
  resolveProductBanner,
  resolvePromo,
  unavailableIds,
  validateBrand,
  type AdvertisingConfig,
} from "@/lib/advertising";

const product = (
  id: string,
  categoryId: string,
  extra: Partial<Product> = {},
): Product => ({
  id,
  group: "",
  name: id,
  price: 10,
  categoryId,
  ...extra,
});
const category = (id: string, order: number, enabled = true): Category => ({
  id,
  name: id,
  order,
  enabled,
});
const combo = (id: string, extra: Partial<Combo> = {}): Combo => ({
  id,
  name: id,
  price: 100,
  items: [{ productId: "p1", qty: 1 }],
  enabled: true,
  ...extra,
});
const config = (extra: Partial<AdvertisingConfig>): AdvertisingConfig => ({
  ...DEFAULT_ADVERTISING,
  ...extra,
});

const products = [
  product("p1", "a"),
  product("p2", "a"),
  product("p3", "b"),
  product("p4", "a"),
];

describe("resolvePromo", () => {
  const combos = [combo("c1"), combo("c2"), combo("c3"), combo("c4")];

  it("conserva el orden guardado y adjunta la foto", () => {
    const blocks = resolvePromo(
      config({ promoComboIds: ["c2", "c1"] }),
      combos,
      products,
      { c1: "img1" },
    );
    expect(blocks.map((b) => b.combo.id)).toEqual(["c2", "c1"]);
    expect(blocks[1].image).toBe("img1");
    expect(blocks[0].image).toBeUndefined();
  });

  it("omite inexistentes, deshabilitados y agotados", () => {
    const list = [
      combo("c1", { enabled: false }),
      combo("c2", { items: [{ productId: "agotado", qty: 1 }] }),
      combo("c3"),
    ];
    const withSoldOut = [
      ...products,
      product("agotado", "a", { soldOut: true }),
    ];
    const blocks = resolvePromo(
      config({ promoComboIds: ["c1", "c2", "c3", "nope"] }),
      list,
      withSoldOut,
      {},
    );
    expect(blocks.map((b) => b.combo.id)).toEqual(["c3"]);
  });

  it("limita a 3 combos", () => {
    const blocks = resolvePromo(
      config({ promoComboIds: ["c1", "c2", "c3", "c4"] }),
      combos,
      products,
      {},
    );
    expect(blocks).toHaveLength(3);
  });
});

describe("resolveMenu", () => {
  const categories = [
    category("b", 2),
    category("a", 1),
    category("x", 3, false),
  ];

  it("agrupa por categoría en orden de categorías y de ids", () => {
    const blocks = resolveMenu(
      config({ menuProductIds: ["p3", "p4", "p1"] }),
      products,
      categories,
    );
    expect(blocks.map((b) => b.category.id)).toEqual(["a", "b"]);
    expect(blocks[0].products.map((p) => p.id)).toEqual(["p4", "p1"]);
  });

  it("omite categorías vacías, deshabilitadas y productos agotados o inexistentes", () => {
    const list = [
      ...products,
      product("p5", "x"),
      product("p6", "a", { soldOut: true }),
    ];
    const blocks = resolveMenu(
      config({ menuProductIds: ["p5", "p6", "nope", "p3"] }),
      list,
      categories,
    );
    expect(blocks.map((b) => b.category.id)).toEqual(["b"]);
  });

  it("sin selección no hay bloques", () => {
    expect(resolveMenu(DEFAULT_ADVERTISING, products, categories)).toEqual([]);
  });
});

describe("moveProduct", () => {
  const ids = ["p1", "p3", "p2", "p4"];

  it("baja saltando productos de otra categoría", () => {
    expect(moveProduct(ids, "p1", 1, products)).toEqual([
      "p2",
      "p3",
      "p1",
      "p4",
    ]);
  });

  it("sube dentro de su categoría", () => {
    expect(moveProduct(ids, "p4", -1, products)).toEqual([
      "p1",
      "p3",
      "p4",
      "p2",
    ]);
  });

  it("no cambia en los extremos de su categoría", () => {
    expect(moveProduct(ids, "p1", -1, products)).toBe(ids);
    expect(moveProduct(ids, "p4", 1, products)).toBe(ids);
    expect(moveProduct(ids, "p3", 1, products)).toBe(ids);
  });

  it("ignora ids que no están en la lista", () => {
    expect(moveProduct(ids, "zzz", 1, products)).toBe(ids);
  });
});

describe("parseAdvertising", () => {
  it("usa los valores por defecto con datos ausentes o malformados", () => {
    expect(parseAdvertising(undefined)).toEqual(DEFAULT_ADVERTISING);
    expect(parseAdvertising("x")).toEqual(DEFAULT_ADVERTISING);
    expect(
      parseAdvertising({ brand: { name: 5 }, promoComboIds: "c1" }),
    ).toEqual(DEFAULT_ADVERTISING);
  });

  it("descarta ids no texto y limita Promo a 3", () => {
    const parsed = parseAdvertising({
      promoComboIds: ["a", 1, "b", "c", "d"],
      menuProductIds: ["p", null],
    });
    expect(parsed.promoComboIds).toEqual(["a", "b", "c"]);
    expect(parsed.menuProductIds).toEqual(["p"]);
    expect(parsed.productBannerId).toBeNull();
    expect(parseAdvertising({ productBannerId: "p1" }).productBannerId).toBe(
      "p1",
    );
  });
});

describe("resolveProductBanner", () => {
  const categories = [category("a", 1), category("b", 2, false)];
  const list = [
    ...products,
    product("sold", "a", { soldOut: true }),
    product("hidden", "b"),
  ];
  const pick = (id: string | null) =>
    resolveProductBanner(config({ productBannerId: id }), list, categories, {
      p1: "img1",
    });

  it("devuelve el producto con su foto", () => {
    expect(pick("p1")).toEqual({ product: list[0], image: "img1" });
    expect(pick("p2")?.image).toBeUndefined();
  });

  it("null si no hay selección, no existe, está agotado o su categoría está deshabilitada", () => {
    for (const id of [null, "nope", "sold", "hidden"])
      expect(pick(id)).toBeNull();
  });
});

describe("moveItem", () => {
  const ids = ["a", "b", "c"];

  it("intercambia con el vecino", () => {
    expect(moveItem(ids, "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(ids, "b", 1)).toEqual(["a", "c", "b"]);
  });

  it("no cambia en los extremos ni con ids desconocidos", () => {
    expect(moveItem(ids, "a", -1)).toBe(ids);
    expect(moveItem(ids, "c", 1)).toBe(ids);
    expect(moveItem(ids, "z", 1)).toBe(ids);
  });
});

describe("unavailableIds", () => {
  it("devuelve los ids que ya no están disponibles", () => {
    expect(unavailableIds(["a", "b", "c"], [{ id: "b" }])).toEqual(["a", "c"]);
  });
});

describe("bannerFileName", () => {
  it("usa plantilla, fecha local y extensión", () => {
    const date = new Date(2026, 10, 3);
    expect(bannerFileName("promo", date, "png")).toBe(
      "publicidad-promo-2026-11-03.png",
    );
    expect(bannerFileName("menu", date, "pdf")).toBe(
      "publicidad-menu-2026-11-03.pdf",
    );
    expect(bannerFileName("product", date, "png")).toBe(
      "publicidad-product-2026-11-03.png",
    );
  });
});

describe("validateBrand", () => {
  const ok = DEFAULT_ADVERTISING.brand;

  it("acepta la marca por defecto", () => {
    expect(validateBrand(ok)).toBeNull();
  });

  it("rechaza nombre vacío o demasiado largo", () => {
    expect(validateBrand({ ...ok, name: "  " })).not.toBeNull();
    expect(validateBrand({ ...ok, name: "x".repeat(41) })).not.toBeNull();
    expect(validateBrand({ ...ok, name: "x".repeat(40) })).toBeNull();
  });

  it("rechaza teléfono, dirección y título fuera de límite", () => {
    expect(validateBrand({ ...ok, phone: "1".repeat(21) })).not.toBeNull();
    expect(validateBrand({ ...ok, address: "x".repeat(61) })).not.toBeNull();
    expect(validateBrand({ ...ok, promoTitle: "x".repeat(31) })).not.toBeNull();
  });

  it("permite dirección y título vacíos", () => {
    expect(validateBrand({ ...ok, address: "", promoTitle: "" })).toBeNull();
  });
});
