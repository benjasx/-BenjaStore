import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Product } from "@/data/mock";
import type { Category } from "@/hooks/useCategories";
import type { Combo } from "@/hooks/useCombos";
import { AdvertisingScreen } from "@/screens/AdvertisingScreen";
import { DEFAULT_ADVERTISING, type AdvertisingConfig } from "@/lib/advertising";

const adv = vi.hoisted(() => ({
  state: {} as {
    config: AdvertisingConfig;
    loading: boolean;
    error: Error | null;
  },
  save: vi.fn(),
  retry: vi.fn(),
}));

vi.mock("@/hooks/useAdvertising", () => ({
  useAdvertising: () => ({ ...adv.state, save: adv.save, retry: adv.retry }),
}));

const exporter = vi.hoisted(() => ({ png: vi.fn(), pdf: vi.fn() }));
vi.mock("@/lib/bannerExport", () => ({
  downloadBannerPng: exporter.png,
  downloadBannerPdf: exporter.pdf,
}));

const products: Product[] = [
  { id: "p1", group: "", name: "Alitas", price: 14, categoryId: "a" },
  { id: "p2", group: "", name: "Papas", price: 55, categoryId: "a" },
  {
    id: "p3",
    group: "",
    name: "Agotado",
    price: 1,
    categoryId: "a",
    soldOut: true,
  },
];
const categories: Category[] = [
  { id: "a", name: "Mas", order: 1, enabled: true },
];
const combo = (id: string, extra: Partial<Combo> = {}): Combo => ({
  id,
  name: `Combo ${id}`,
  price: 299,
  items: [{ productId: "p1", qty: 2 }],
  enabled: true,
  ...extra,
});

const setup = (props: Partial<Parameters<typeof AdvertisingScreen>[0]> = {}) =>
  render(
    <AdvertisingScreen
      products={products}
      categories={categories}
      combos={[combo("1"), combo("2"), combo("3"), combo("4")]}
      sauces={[{ id: "s1", name: "BBQ", extraPrice: 0, enabled: true }]}
      images={{}}
      loading={false}
      error={null}
      onRetry={() => {}}
      onBack={() => {}}
      {...props}
    />,
  );

beforeEach(() => {
  adv.state = { config: DEFAULT_ADVERTISING, loading: false, error: null };
  adv.save.mockReset().mockResolvedValue(undefined);
  adv.retry.mockReset();
  exporter.png.mockReset().mockResolvedValue(undefined);
  exporter.pdf.mockReset().mockResolvedValue(undefined);
});

describe("AdvertisingScreen Promo", () => {
  it("sin combos registrados lo indica", () => {
    setup({ combos: [] });
    expect(screen.getByText(/No hay combos registrados/)).toBeInTheDocument();
  });

  it("sin selección pide elegir un combo", () => {
    setup();
    expect(
      screen.getByText("Elige al menos un combo para ver el banner."),
    ).toBeInTheDocument();
  });

  it("limita a 3 combos y los muestra en la vista previa", async () => {
    setup();
    for (const n of ["1", "2", "3"])
      await userEvent.click(
        screen.getByRole("checkbox", { name: new RegExp(`Combo ${n}`, "i") }),
      );
    expect(screen.getByRole("checkbox", { name: /Combo 4/i })).toBeDisabled();
    expect(screen.getByTestId("banner-preview")).toBeInTheDocument();
  });

  it("marca como No disponible un combo guardado que ya no existe", () => {
    adv.state.config = { ...DEFAULT_ADVERTISING, promoComboIds: ["fantasma"] };
    setup();
    expect(screen.getByText("No disponible")).toBeInTheDocument();
  });

  it("guarda la selección y el orden", async () => {
    setup();
    await userEvent.click(screen.getByRole("checkbox", { name: /Combo 1/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Combo 2/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /Subir Combo 2/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(adv.save).toHaveBeenCalledWith(
      expect.objectContaining({ promoComboIds: ["2", "1"] }),
    );
  });
});

describe("AdvertisingScreen marca", () => {
  it("Guardar está desactivado sin cambios", () => {
    setup();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("un nombre vacío muestra error y no permite guardar", async () => {
    setup();
    await userEvent.clear(screen.getByLabelText("Nombre del negocio"));
    expect(screen.getByRole("alert")).toHaveTextContent("obligatorio");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("guarda los cambios de teléfono", async () => {
    setup();
    const phone = screen.getByLabelText("Teléfono");
    await userEvent.clear(phone);
    await userEvent.type(phone, "555");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(adv.save).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: expect.objectContaining({ phone: "555" }),
      }),
    );
  });

  it("muestra el error si falla el guardado", async () => {
    adv.save.mockRejectedValue(new Error("Sin conexión"));
    setup();
    await userEvent.type(screen.getByLabelText("Teléfono"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");
  });
});

describe("AdvertisingScreen Menú", () => {
  const openMenu = () =>
    userEvent.click(screen.getByRole("button", { name: "Menú" }));

  it("lista solo productos no agotados y arma la vista previa", async () => {
    setup();
    await openMenu();
    expect(
      screen.getByText("Elige al menos un producto para ver el banner."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Agotado")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /Alitas/i }));
    expect(screen.getByTestId("banner-preview")).toBeInTheDocument();
  });

  it("reordena dentro de la categoría", async () => {
    setup();
    await openMenu();
    await userEvent.click(screen.getByRole("checkbox", { name: /Alitas/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Papas/i }));
    await userEvent.click(screen.getByRole("button", { name: /Subir Papas/i }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(adv.save).toHaveBeenCalledWith(
      expect.objectContaining({ menuProductIds: ["p2", "p1"] }),
    );
  });

  it("sin productos registrados lo indica", async () => {
    setup({ products: [] });
    await openMenu();
    expect(
      screen.getByText("No hay productos registrados."),
    ).toBeInTheDocument();
  });
});

describe("AdvertisingScreen PNG", () => {
  it("está desactivado sin nada que mostrar, con error o cargando", () => {
    const { unmount } = setup();
    expect(screen.getByRole("button", { name: "PNG" })).toBeDisabled();
    unmount();
    setup({ error: new Error("x") });
    expect(screen.queryByRole("button", { name: "PNG" })).toBeNull();
    expect(screen.queryByRole("button", { name: "PDF" })).toBeNull();
  });

  it("descarga el banner y muestra Generando… mientras trabaja", async () => {
    let finish: () => void = () => {};
    exporter.png.mockReturnValue(new Promise<void>((r) => (finish = r)));
    setup();
    await userEvent.click(screen.getByRole("checkbox", { name: /Combo 1/i }));
    await userEvent.click(screen.getByRole("button", { name: "PNG" }));
    expect(screen.getByRole("button", { name: "Generando…" })).toBeDisabled();
    expect(exporter.png).toHaveBeenCalledWith(expect.any(HTMLElement), "promo");
    finish();
    expect(await screen.findByRole("button", { name: "PNG" })).toBeEnabled();
  });

  it("PDF está desactivado sin contenido y exporta con la plantilla actual", async () => {
    setup();
    expect(screen.getByRole("button", { name: "PDF" })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: /Combo 1/i }));
    await userEvent.click(screen.getByRole("button", { name: "PDF" }));
    expect(exporter.pdf).toHaveBeenCalledWith(expect.any(HTMLElement), "promo");
    expect(exporter.png).not.toHaveBeenCalled();
  });

  it("muestra Generando… en PDF y bloquea ambos botones", async () => {
    let finish: () => void = () => {};
    exporter.pdf.mockReturnValue(new Promise<void>((r) => (finish = r)));
    setup();
    await userEvent.click(screen.getByRole("checkbox", { name: /Combo 1/i }));
    await userEvent.click(screen.getByRole("button", { name: "PDF" }));
    expect(screen.getByRole("button", { name: "Generando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "PNG" })).toBeDisabled();
    finish();
    expect(await screen.findByRole("button", { name: "PDF" })).toBeEnabled();
  });

  it("muestra el fallo del PDF y la pantalla sigue usable", async () => {
    exporter.pdf.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    setup();
    await userEvent.click(screen.getByRole("checkbox", { name: /Combo 1/i }));
    await userEvent.click(screen.getByRole("button", { name: "PDF" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo generar el archivo. Inténtalo de nuevo.",
    );
    expect(screen.getByRole("button", { name: "PDF" })).toBeEnabled();
  });

  it("usa la plantilla Menú al exportar desde Menú", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Menú" }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Alitas/i }));
    await userEvent.click(screen.getByRole("button", { name: "PNG" }));
    expect(exporter.png).toHaveBeenCalledWith(expect.any(HTMLElement), "menu");
  });

  it("muestra el fallo y la pantalla sigue usable", async () => {
    exporter.png.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    setup();
    await userEvent.click(screen.getByRole("checkbox", { name: /Combo 1/i }));
    await userEvent.click(screen.getByRole("button", { name: "PNG" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo generar el archivo. Inténtalo de nuevo.",
    );
    expect(screen.getByRole("button", { name: "PNG" })).toBeEnabled();
  });
});

describe("AdvertisingScreen Producto", () => {
  const openProduct = () =>
    userEvent.click(screen.getByRole("button", { name: "Producto" }));

  it("pide elegir un producto y lista solo los disponibles", async () => {
    setup();
    await openProduct();
    expect(
      screen.getByText("Elige un producto para ver el banner."),
    ).toBeInTheDocument();
    const select = screen.getByLabelText("Producto del banner");
    expect(select).toHaveTextContent("Alitas");
    expect(select).not.toHaveTextContent("Agotado");
  });

  it("muestra la vista previa, exporta como product y guarda la elección", async () => {
    setup();
    await openProduct();
    await userEvent.selectOptions(
      screen.getByLabelText("Producto del banner"),
      "p2",
    );
    expect(screen.getByTestId("banner-preview")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "PNG" }));
    expect(exporter.png).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      "product",
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(adv.save).toHaveBeenCalledWith(
      expect.objectContaining({ productBannerId: "p2" }),
    );
  });

  it("marca como No disponible un producto guardado que ya no existe", async () => {
    adv.state.config = { ...DEFAULT_ADVERTISING, productBannerId: "fantasma" };
    setup();
    await openProduct();
    expect(screen.getByText("No disponible")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Quitar/ }));
    expect(screen.queryByText("No disponible")).not.toBeInTheDocument();
  });
});

describe("AdvertisingScreen estados", () => {
  it("muestra el error con reintento", async () => {
    const onRetry = vi.fn();
    setup({ error: new Error("x"), onRetry });
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("reintenta la lectura de publicidad", async () => {
    adv.state.error = new Error("x");
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(adv.retry).toHaveBeenCalled();
  });

  it("no muestra el formulario mientras carga", () => {
    setup({ loading: true });
    expect(screen.queryByLabelText("Teléfono")).not.toBeInTheDocument();
  });
});
