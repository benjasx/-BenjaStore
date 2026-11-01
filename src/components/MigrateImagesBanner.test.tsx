import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MigrateImagesBanner } from "@/components/MigrateImagesBanner";
import type { Product } from "@/data/mock";
import type { Combo } from "@/hooks/useCombos";

const { migrateImages } = vi.hoisted(() => ({ migrateImages: vi.fn() }));

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("@/lib/imageStore", () => ({ migrateImages }));

const product = (id: string, image?: string): Product => ({
  id,
  group: "g",
  name: id,
  price: 10,
  categoryId: "c",
  ...(image && { image }),
});

const combo = (id: string, image?: string): Combo => ({
  id,
  name: id,
  price: 10,
  items: [],
  enabled: true,
  ...(image && { image }),
});

describe("MigrateImagesBanner", () => {
  beforeEach(() => {
    migrateImages.mockReset();
    migrateImages.mockResolvedValue(2);
  });

  it("no aparece si nada tiene imagen vieja", () => {
    const { container } = render(
      <MigrateImagesBanner
        products={[product("p1")]}
        combos={[combo("c1")]}
        images={{ p1: "x" }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("cuenta las fotos viejas de productos y combos", () => {
    render(
      <MigrateImagesBanner
        products={[product("p1", "data:a"), product("p2")]}
        combos={[combo("c1", "data:b")]}
        images={{}}
      />,
    );
    expect(screen.getByText(/2 fotos en el formato anterior/)).toBeVisible();
  });

  it("migra pasando las fotos viejas y el mapa actual", async () => {
    render(
      <MigrateImagesBanner
        products={[product("p1", "data:a")]}
        combos={[combo("c1", "data:b")]}
        images={{ p1: "nuevo" }}
      />,
    );
    await userEvent.click(screen.getByText("Migrar imágenes"));
    expect(migrateImages).toHaveBeenCalledWith(
      [
        { id: "p1", collection: "products", image: "data:a" },
        { id: "c1", collection: "combos", image: "data:b" },
      ],
      expect.any(Function),
      { p1: "nuevo" },
    );
  });

  it("si falla muestra el error y permite reintentar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    migrateImages.mockRejectedValue(new Error("fallo"));
    render(
      <MigrateImagesBanner
        products={[product("p1", "data:a")]}
        combos={[]}
        images={{}}
      />,
    );
    await userEvent.click(screen.getByText("Migrar imágenes"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron migrar",
    );
    expect(screen.getByText("Migrar imágenes")).toBeEnabled();
  });
});
