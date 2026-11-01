import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/App";
import type { Product } from "@/data/mock";
import type { Category } from "@/hooks/useCategories";
import type { SaleData } from "@/lib/sales";

const { createSale } = vi.hoisted(() => ({ createSale: vi.fn() }));

vi.mock("@/lib/sales", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sales")>()),
  createSale,
}));

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
        {
          id: "bu",
          group: "Burrito",
          name: "Burrito",
          price: 100,
          categoryId: "al",
          usesSauces: true,
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

vi.mock("@/hooks/useCombos", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/useCombos")>()),
  useCombos: () => ({
    combos: [],
    loading: false,
    error: null,
    retry: () => {},
    createCombo: async () => {},
    updateCombo: async () => {},
    deleteCombo: async () => {},
    setComboEnabled: async () => {},
  }),
}));

vi.mock("@/hooks/usePromotions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/usePromotions")>()),
  usePromotions: () => ({
    promotions: [],
    loading: false,
    error: null,
    retry: () => {},
    createPromotion: async () => {},
    updatePromotion: async () => {},
    deletePromotion: async () => {},
    setPromotionEnabled: async () => {},
  }),
}));

vi.mock("@/hooks/useSauces", () => ({
  useSauces: () => ({
    sauces: [{ id: "bbq", name: "bbq", extraPrice: 10, enabled: true }],
    loading: false,
    error: null,
    retry: () => {},
    createSauce: async () => {},
    updateSauce: async () => {},
    deleteSauce: async () => {},
    setSauceEnabled: async () => {},
  }),
}));

const enterPos = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByText(/entrar con pin/i));
  for (const d of ["1", "2", "3", "4"]) await user.click(screen.getByText(d));
};

const addBurritoWithExtraSauce = async (
  user: ReturnType<typeof userEvent.setup>,
) => {
  await user.click(screen.getByText("Burrito"));
  await user.click(
    screen.getByRole("button", { name: "Agregar salsa incluida bbq" }),
  );
  await user.click(screen.getByRole("button", { name: "Agregar extra bbq" }));
  await user.click(
    screen.getByRole("button", { name: "Agregar · +$10 extra" }),
  );
};

const openPayment = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByText("Cobrar"));
  await user.click(screen.getByRole("button", { name: "Cobrar $110" }));
};

describe("App", () => {
  beforeEach(() => {
    createSale.mockReset();
    createSale.mockImplementation(async (data: SaleData) => ({
      ...data,
      id: "s1",
      folio: 1,
      createdAt: { toDate: () => new Date(2026, 10, 1, 12, 0) },
    }));
  });

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
      screen.getAllByRole("heading", { name: /nueva venta/i }),
    ).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Agregar 6 Alitas" }),
    ).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("adds a product from the menu and lists it", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: "Ingresar como administrador" }),
    );
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
    await user.click(
      screen.getByRole("button", { name: "Ingresar como administrador" }),
    );
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
    await user.click(
      screen.getByRole("button", { name: "Ingresar como administrador" }),
    );
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
    await user.click(
      screen.getByRole("button", { name: "Ingresar como administrador" }),
    );
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
    await user.click(
      screen.getByRole("button", { name: "Ingresar como administrador" }),
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await user.click(screen.getByText("Menú"));
    await user.click(screen.getByRole("button", { name: "Editar 6 Alitas" }));
    await user.click(screen.getByText("Eliminar producto"));
    expect(screen.getByText("6 Alitas")).toBeInTheDocument();
    await user.click(screen.getByText("Sí, eliminar"));
    expect(screen.queryByText("6 Alitas")).not.toBeInTheDocument();
  });

  it("requires the included sauce before adding a product with sauces", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterPos(user);
    await user.click(screen.getByText("Burrito"));
    const confirm = screen.getByRole("button", { name: "Agregar" });
    expect(confirm).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Agregar salsa incluida bbq" }),
    );
    expect(confirm).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Agregar salsa incluida bbq" }),
    ).toBeDisabled();
  });

  it("saves the sale and shows the ticket", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterPos(user);
    await addBurritoWithExtraSauce(user);
    await openPayment(user);
    await user.click(screen.getByRole("button", { name: "Confirmar venta" }));

    expect(createSale).toHaveBeenCalledTimes(1);
    const data: SaleData = createSale.mock.calls[0][0];
    expect(data).toMatchObject({
      channel: "Mostrador",
      total: 110,
      paymentMethod: "Efectivo",
      received: 500,
      change: 390,
    });
    expect(data.lines[0]).toMatchObject({
      itemId: "bu",
      extras: 10,
      sauces: { included: ["bbq"], extra: [{ name: "bbq", price: 10 }] },
    });

    const ticket = await screen.findByRole("dialog", { name: "Ticket #0001" });
    expect(within(ticket).getByText("1× Burrito")).toBeInTheDocument();
    expect(within(ticket).getByText("Salsa: bbq")).toBeInTheDocument();
    expect(within(ticket).getByText("Cambio")).toBeInTheDocument();
    expect(screen.queryByText("×1")).not.toBeInTheDocument();

    await user.click(
      within(ticket).getByRole("button", { name: "Nueva venta" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the cart and shows an error when the sale cannot be saved", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    createSale.mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    render(<App />);
    await enterPos(user);
    await addBurritoWithExtraSauce(user);
    await openPayment(user);
    await user.click(screen.getByRole("button", { name: "Confirmar venta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no se pudo guardar la venta/i,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar venta" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cobrar $110" })).toBeEnabled();
    consoleError.mockRestore();
  });

  it("accepts a custom cash amount and blocks amounts below the total", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterPos(user);
    await addBurritoWithExtraSauce(user);
    await openPayment(user);
    const received = screen.getByLabelText("Monto recibido");
    await user.clear(received);
    await user.type(received, "50");
    expect(
      screen.getByRole("button", { name: "Confirmar venta" }),
    ).toBeDisabled();
    await user.clear(received);
    await user.type(received, "1000");
    await user.click(screen.getByRole("button", { name: "Confirmar venta" }));
    expect(createSale.mock.calls[0][0]).toMatchObject({
      received: 1000,
      change: 890,
    });
  });

  it("uses the $200 quick amount", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterPos(user);
    await addBurritoWithExtraSauce(user);
    await openPayment(user);
    await user.click(screen.getByRole("button", { name: "$200" }));
    expect(screen.getByLabelText("Monto recibido")).toHaveValue(200);
    expect(screen.queryByRole("button", { name: "$400" })).toBeNull();
  });

  it("saves the transaction reference for card payments", async () => {
    const user = userEvent.setup();
    render(<App />);
    await enterPos(user);
    await addBurritoWithExtraSauce(user);
    await openPayment(user);
    await user.click(screen.getByRole("button", { name: "Tarjeta" }));
    expect(screen.queryByLabelText("Monto recibido")).toBeNull();
    await user.type(screen.getByLabelText("Folio de la transacción"), "XY99");
    await user.click(screen.getByRole("button", { name: "Confirmar venta" }));
    const data: SaleData = createSale.mock.calls[0][0];
    expect(data).toMatchObject({ paymentMethod: "Tarjeta", reference: "XY99" });
    expect(data).not.toHaveProperty("received");
    const ticket = await screen.findByRole("dialog", { name: "Ticket #0001" });
    expect(within(ticket).getByText("XY99")).toBeInTheDocument();
  });

  it("prints the ticket", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);
    await enterPos(user);
    await addBurritoWithExtraSauce(user);
    await openPayment(user);
    await user.click(screen.getByRole("button", { name: "Confirmar venta" }));
    await user.click(await screen.findByRole("button", { name: "Imprimir" }));
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });
});
