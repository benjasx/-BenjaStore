import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/App";

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
});
