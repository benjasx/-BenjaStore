import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/App";
import type { Product } from "@/data/mock";
import type { Category } from "@/hooks/useCategories";

vi.mock("@/hooks/useCategories", async () => {
  const { useState } = await import("react");
  return {
    useCategories: () => {
      const [categories, setCategories] = useState<Category[]>([
        { id: "al", name: "Alitas", order: 0, enabled: true },
      ]);
      return {
        categories,
        loading: false,
        error: null,
        retry: () => {},
        createCategory: async (name: string) => {
          setCategories((list) => [
            ...list,
            {
              id: crypto.randomUUID(),
              name,
              order: list.length,
              enabled: true,
            },
          ]);
        },
        renameCategory: async () => {},
        setCategoryEnabled: async (id: string, enabled: boolean) => {
          setCategories((list) =>
            list.map((c) => (c.id === id ? { ...c, enabled } : c)),
          );
        },
        moveCategory: async () => {},
      };
    },
  };
});

vi.mock("@/hooks/useProducts", async () => {
  const { useState } = await import("react");
  return {
    useProducts: () => {
      const [products, setProducts] = useState<Product[]>([
        {
          id: "a6",
          group: "Paquete",
          name: "6 Alitas",
          price: 97,
          categoryId: "al",
        },
      ]);
      return {
        products,
        loading: false,
        error: null,
        retry: () => {},
        addProduct: async (product: Omit<Product, "id">) => {
          setProducts((list) => [
            ...list,
            { ...product, id: crypto.randomUUID() },
          ]);
        },
        updateProduct: async (
          id: string,
          changes: { name: string; price: number; description: string },
        ) => {
          setProducts((list) =>
            list.map((p) => (p.id === id ? { ...p, ...changes } : p)),
          );
        },
        deleteProduct: async (id: string) => {
          setProducts((list) => list.filter((p) => p.id !== id));
        },
        setSoldOut: async (id: string, soldOut: boolean) => {
          setProducts((list) =>
            list.map((p) => (p.id === id ? { ...p, soldOut } : p)),
          );
        },
      };
    },
  };
});

describe("App", () => {
  it("renders the login screen", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /doble tentación/i }),
    ).toBeInTheDocument();
  });

  it("sells a product through the PIN flow", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText(/entrar con pin/i));
    for (const d of ["1", "2", "3", "4"]) await user.click(screen.getByText(d));
    await user.click(screen.getByText("6 Alitas"));
    expect(screen.getByText("×1")).toBeInTheDocument();
  });

  it("shows the cart beside the products on desktop", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText(/entrar con pin/i));
    for (const d of ["1", "2", "3", "4"]) await user.click(screen.getByText(d));
    await user.click(screen.getByText("6 Alitas"));
    expect(
      screen.getByRole("heading", { name: /ticket #0148/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Agregar 6 Alitas" }),
    ).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("adds a product from the menu and lists it", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await user.click(screen.getByText("Menú"));
    await user.click(screen.getByText("+ Producto"));
    await user.type(screen.getByPlaceholderText("Ej. 12 Alitas"), "12 Alitas");
    await user.type(screen.getByPlaceholderText("$0"), "120");
    await user.click(screen.getByText("Guardar producto"));
    expect(screen.getByText("12 Alitas")).toBeInTheDocument();
  });

  it("hides disabled and empty categories from the POS", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await user.click(screen.getByText("Menú"));
    await user.click(screen.getByText("Editar categorías"));
    await user.type(screen.getByLabelText("Nueva categoría"), "Tacos");
    await user.click(screen.getByText("Agregar"));
    expect(screen.queryByLabelText("Nombre de Tacos")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Editar nombre de Tacos" }),
    );
    expect(screen.getByLabelText("Nombre de Tacos")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(
      screen.getByRole("switch", { name: "Habilitada: Alitas" }),
    );
    await user.click(screen.getByText("Vender"));
    expect(screen.queryByRole("button", { name: "Tacos" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Alitas" })).toBeNull();
    expect(
      screen.getByText(/no hay categorías con productos disponibles/i),
    ).toBeInTheDocument();
  });

  it("edits name, price and description of a product from the menu", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await user.click(screen.getByText("Menú"));
    await user.click(screen.getByRole("button", { name: "Editar 6 Alitas" }));
    const name = screen.getByLabelText("Nombre de 6 Alitas");
    await user.clear(name);
    await user.type(name, "Combo");
    const price = screen.getByLabelText("Precio de 6 Alitas");
    await user.clear(price);
    await user.type(price, "120");
    await user.type(
      screen.getByLabelText("Descripción de 6 Alitas"),
      "Seis alitas con salsa",
    );
    await user.click(screen.getByText("Guardar"));
    expect(screen.getByText("Combo")).toBeInTheDocument();
    expect(screen.getByText(/\$120/)).toBeInTheDocument();
    expect(screen.getByText("Seis alitas con salsa")).toBeInTheDocument();
    expect(screen.queryByText("6 Alitas")).not.toBeInTheDocument();
  });

  it("saves a description when adding a product", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await user.click(screen.getByText("Menú"));
    await user.click(screen.getByText("+ Producto"));
    await user.type(screen.getByPlaceholderText("Ej. 12 Alitas"), "12 Alitas");
    await user.type(screen.getByPlaceholderText("$0"), "120");
    await user.type(
      screen.getByPlaceholderText("Qué es y qué contiene"),
      "Con papas",
    );
    await user.click(screen.getByText("Guardar producto"));
    expect(screen.getByText("Con papas")).toBeInTheDocument();
  });

  it("deletes a product after confirming", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await user.click(screen.getByText("Menú"));
    await user.click(screen.getByRole("button", { name: "Editar 6 Alitas" }));
    await user.click(screen.getByText("Eliminar producto"));
    expect(screen.getByText("6 Alitas")).toBeInTheDocument();
    await user.click(screen.getByText("Sí, eliminar"));
    expect(screen.queryByText("6 Alitas")).not.toBeInTheDocument();
  });
});
