import { render, screen } from "@testing-library/react";
import type { Product } from "@/data/mock";
import { ProductBanner } from "@/components/ProductBanner";
import { DEFAULT_ADVERTISING } from "@/lib/advertising";

const product = (extra: Partial<Product> = {}): Product => ({
  id: "p1",
  group: "",
  name: "5 tacos x 55",
  price: 55,
  categoryId: "a",
  description: "Aplica en asada",
  ...extra,
});

describe("ProductBanner", () => {
  it("muestra nombre, descripción, precio, foto y contacto", () => {
    const { container } = render(
      <ProductBanner
        brand={DEFAULT_ADVERTISING.brand}
        block={{ product: product(), image: "data:image/png;base64,AA" }}
      />,
    );
    expect(screen.getByText("5 tacos x 55")).toBeInTheDocument();
    expect(screen.getByText("Aplica en asada")).toBeInTheDocument();
    expect(screen.getByText("$55")).toBeInTheDocument();
    expect(screen.getByText("Ordena al 81 4973 6481")).toBeInTheDocument();
    expect(
      container.querySelector('img[src="data:image/png;base64,AA"]'),
    ).not.toBeNull();
  });

  it("sin foto ni descripción se dibuja solo con texto", () => {
    const { container } = render(
      <ProductBanner
        brand={DEFAULT_ADVERTISING.brand}
        block={{ product: product({ description: undefined }) }}
      />,
    );
    expect(screen.queryByText("Aplica en asada")).not.toBeInTheDocument();
    // solo queda el logo
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("reduce la letra con nombres largos", () => {
    render(
      <ProductBanner
        brand={DEFAULT_ADVERTISING.brand}
        block={{ product: product({ name: "x".repeat(30) }) }}
      />,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveStyle({
      fontSize: "56px",
    });
  });
});
