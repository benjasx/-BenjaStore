import { render, screen } from "@testing-library/react";
import type { Product } from "@/data/mock";
import type { Combo } from "@/hooks/useCombos";
import { PromoBanner } from "@/components/PromoBanner";
import { DEFAULT_ADVERTISING } from "@/lib/advertising";

const products: Product[] = [
  { id: "p1", group: "", name: "Alitas", price: 10, categoryId: "a" },
  { id: "p2", group: "", name: "Papas", price: 10, categoryId: "a" },
];
const combo = (id: string, extra: Partial<Combo> = {}): Combo => ({
  id,
  name: `Combo ${id}`,
  price: 299,
  items: [
    { productId: "p1", qty: 2 },
    { productId: "p2", qty: 1 },
  ],
  enabled: true,
  ...extra,
});

describe("PromoBanner", () => {
  it("muestra nombre, componentes con cantidad, precio y foto", () => {
    const { container } = render(
      <PromoBanner
        brand={DEFAULT_ADVERTISING.brand}
        products={products}
        blocks={[{ combo: combo("c1"), image: "data:image/png;base64,AA" }]}
      />,
    );
    expect(screen.getByText("Combo c1")).toBeInTheDocument();
    expect(screen.getByText("2 Alitas")).toBeInTheDocument();
    expect(screen.getByText("1 Papas")).toBeInTheDocument();
    expect(screen.getByText("$299")).toBeInTheDocument();
    expect(
      container.querySelector('img[src="data:image/png;base64,AA"]'),
    ).not.toBeNull();
  });

  it("alterna la foto: derecha en el primero, izquierda en el segundo", () => {
    const { container } = render(
      <PromoBanner
        brand={DEFAULT_ADVERTISING.brand}
        products={products}
        blocks={[
          { combo: combo("c1"), image: "data:image/png;base64,AA" },
          { combo: combo("c2"), image: "data:image/png;base64,BB" },
          { combo: combo("c3"), image: "data:image/png;base64,CC" },
        ]}
      />,
    );
    const sections = container.querySelectorAll("section");
    expect(sections[0]).not.toHaveClass("flex-row-reverse");
    expect(sections[1]).toHaveClass("flex-row-reverse");
    expect(sections[2]).not.toHaveClass("flex-row-reverse");
  });

  it("reduce la letra de los componentes cuando el texto es largo", () => {
    const long = "x".repeat(120);
    const { container } = render(
      <PromoBanner
        brand={DEFAULT_ADVERTISING.brand}
        products={products}
        blocks={[
          { combo: combo("c1", { items: [], description: "Corto" }) },
          { combo: combo("c2", { items: [], description: long }) },
        ]}
      />,
    );
    const lists = container.querySelectorAll("ul");
    expect(lists[0]).toHaveStyle({ fontSize: "32px" });
    expect(lists[1]).toHaveStyle({ fontSize: "25px" });
  });

  it("dibuja un combo sin foto sin imagen del combo", () => {
    const { container } = render(
      <PromoBanner
        brand={DEFAULT_ADVERTISING.brand}
        products={products}
        blocks={[{ combo: combo("c1") }]}
      />,
    );
    expect(screen.getByText("Combo c1")).toBeInTheDocument();
    // solo queda el logo
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("usa la descripción si el combo no tiene componentes", () => {
    render(
      <PromoBanner
        brand={DEFAULT_ADVERTISING.brand}
        products={products}
        blocks={[{ combo: combo("c1", { items: [], description: "Surtido" }) }]}
      />,
    );
    expect(screen.getByText("Surtido")).toBeInTheDocument();
  });

  it("usa el título de Promo o el nombre del negocio, y pie de contacto", () => {
    const { rerender } = render(
      <PromoBanner
        brand={{ ...DEFAULT_ADVERTISING.brand, promoTitle: "Fin de semana" }}
        products={products}
        blocks={[]}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Fin de semana" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ordena al 81 4973 6481")).toBeInTheDocument();
    expect(screen.getByText("Villas del Prado #127")).toBeInTheDocument();

    rerender(
      <PromoBanner
        brand={DEFAULT_ADVERTISING.brand}
        products={products}
        blocks={[]}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Doble Tentación" }),
    ).toBeInTheDocument();
  });
});
