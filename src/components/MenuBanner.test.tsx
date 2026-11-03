import { render, screen } from "@testing-library/react";
import type { Product } from "@/data/mock";
import type { Category } from "@/hooks/useCategories";
import type { Sauce } from "@/hooks/useSauces";
import { MenuBanner } from "@/components/MenuBanner";
import { DEFAULT_ADVERTISING } from "@/lib/advertising";

const category = (id: string, name: string): Category => ({
  id,
  name,
  order: 1,
  enabled: true,
});
const product = (id: string, extra: Partial<Product> = {}): Product => ({
  id,
  group: "",
  name: `Prod ${id}`,
  price: 15,
  categoryId: "a",
  ...extra,
});
const sauce = (id: string, name: string): Sauce => ({
  id,
  name,
  extraPrice: 5,
  enabled: true,
});

describe("MenuBanner", () => {
  it("muestra categorías con nombre, descripción y precio", () => {
    render(
      <MenuBanner
        brand={DEFAULT_ADVERTISING.brand}
        sauces={[]}
        blocks={[
          {
            category: category("a", "Alitas"),
            products: [product("1", { description: "Con ranch" })],
          },
          { category: category("b", "Boneless"), products: [product("2")] },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Alitas" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Boneless" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Prod 1")).toBeInTheDocument();
    expect(screen.getByText("Con ranch")).toBeInTheDocument();
    expect(screen.getAllByText("$15")).toHaveLength(2);
  });

  it("lista las salsas sin precio y omite el bloque si no hay", () => {
    const { rerender } = render(
      <MenuBanner
        brand={DEFAULT_ADVERTISING.brand}
        blocks={[]}
        sauces={[sauce("s1", "BBQ"), sauce("s2", "Ranch")]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Salsas" })).toBeInTheDocument();
    expect(screen.getByText("BBQ")).toBeInTheDocument();
    expect(screen.queryByText("$5")).not.toBeInTheDocument();

    rerender(
      <MenuBanner brand={DEFAULT_ADVERTISING.brand} blocks={[]} sauces={[]} />,
    );
    expect(
      screen.queryByRole("heading", { name: "Salsas" }),
    ).not.toBeInTheDocument();
  });

  it("muestra el teléfono y la dirección de la marca", () => {
    render(
      <MenuBanner brand={DEFAULT_ADVERTISING.brand} blocks={[]} sauces={[]} />,
    );
    expect(screen.getByText("Ordena al 81 4973 6481")).toBeInTheDocument();
    expect(screen.getByText("Villas del Prado #127")).toBeInTheDocument();
  });
});
