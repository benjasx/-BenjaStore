import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";
import { RoleContext } from "@/hooks/useRole";
import type { Role } from "@/lib/permissions";
import type { DateRange } from "@/lib/reports";
import type { Sale } from "@/lib/sales";
import { SalesScreen } from "@/screens/SalesScreen";

const { useSalesList, cancelSale } = vi.hoisted(() => ({
  useSalesList: vi.fn(),
  cancelSale: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("@/hooks/useSalesList", () => ({ useSalesList }));
vi.mock("@/lib/sales", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/sales")>()),
  cancelSale,
}));

const sale = (folio: number, overrides: Partial<Sale> = {}): Sale => ({
  id: `s${folio}`,
  folio,
  createdAt: Timestamp.fromDate(new Date(2026, 9, 28, 12, 0)),
  channel: "Mostrador",
  lines: [
    {
      kind: "product",
      itemId: "p1",
      name: "burrito",
      qty: 1,
      unitPrice: 110,
      gross: 110,
      saving: 0,
      extras: 0,
    },
  ],
  subtotal: 110,
  saleSaving: 0,
  total: 110,
  paymentMethod: "Efectivo",
  ...overrides,
});

const retry = vi.fn();
let sales: Sale[] = [];
let state: { loading: boolean; error: Error | null } = {
  loading: false,
  error: null,
};

const renderScreen = (
  seller: { id: string; name: string } | null = null,
  role: Role = "owner",
) =>
  render(
    <RoleContext.Provider value={role}>
      <SalesScreen
        seller={seller ? { ...seller, initials: "AN" } : null}
        onNavigate={vi.fn()}
      />
    </RoleContext.Provider>,
  );

describe("SalesScreen", () => {
  beforeEach(() => {
    sales = [];
    state = { loading: false, error: null };
    retry.mockReset();
    cancelSale.mockReset();
    cancelSale.mockResolvedValue(undefined);
    useSalesList.mockReset();
    useSalesList.mockImplementation(() => ({ sales, ...state, retry }));
  });

  it("muestra las ventas con folio, estado y resumen", () => {
    sales = [
      sale(2, { seller: { id: "an", name: "Ana" } }),
      sale(1, {
        cancelled: { at: Timestamp.now(), reason: "x" },
        total: 50,
      }),
    ];
    renderScreen();
    expect(screen.getByLabelText("Ver ticket 0002")).toBeInTheDocument();
    expect(screen.getByLabelText("Ver ticket 0001")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
    expect(screen.getByText("Canceladas").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("Total vendido").nextSibling).toHaveTextContent(
      "$110",
    );
  });

  it("pagina de 20 en 20", async () => {
    sales = Array.from({ length: 45 }, (_, i) => sale(45 - i));
    renderScreen();
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.getByText("Anterior")).toBeDisabled();
    await userEvent.click(screen.getByText("Siguiente"));
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Siguiente"));
    expect(screen.getByText("Siguiente")).toBeDisabled();
    expect(screen.getAllByLabelText(/Ver ticket/)).toHaveLength(5);
  });

  it("vuelve a la página 1 al cambiar de periodo", async () => {
    sales = Array.from({ length: 45 }, (_, i) => sale(45 - i));
    renderScreen();
    await userEvent.click(screen.getByText("Siguiente"));
    await userEvent.click(screen.getByText("Semana"));
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
  });

  it("muestra el estado vacío", () => {
    renderScreen();
    expect(screen.getByText("Sin ventas en este periodo.")).toBeInTheDocument();
  });

  it("muestra el error y permite reintentar", async () => {
    state = { loading: false, error: new Error("fallo") };
    renderScreen();
    await userEvent.click(screen.getByText(/reintentar/i));
    expect(retry).toHaveBeenCalled();
  });

  it("con un rango inválido avisa y no consulta", async () => {
    renderScreen();
    await userEvent.click(screen.getByText("Rango"));
    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2026-10-20" },
    });
    fireEvent.change(screen.getByLabelText("Hasta"), {
      target: { value: "2026-10-10" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("rango válido");
    const [range] = useSalesList.mock.lastCall as [DateRange | null];
    expect(range).toBeNull();
  });

  it("abre el ticket de una venta", async () => {
    sales = [sale(7)];
    renderScreen();
    await userEvent.click(screen.getByLabelText("Ver ticket 0007"));
    expect(
      screen.getByRole("dialog", { name: "Ticket #0007" }),
    ).toBeInTheDocument();
  });

  it("no ofrece cancelar una venta ya cancelada y muestra su marca", async () => {
    sales = [
      sale(3, {
        cancelled: {
          at: Timestamp.now(),
          reason: "Cliente se arrepintió",
          by: { id: "an", name: "Ana" },
        },
      }),
    ];
    renderScreen();
    await userEvent.click(screen.getByLabelText("Ver ticket 0003"));
    expect(screen.getByText("CANCELADA")).toBeInTheDocument();
    expect(
      screen.getByText("Motivo: Cliente se arrepintió"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cancelar venta")).not.toBeInTheDocument();
  });

  it("exige motivo y cancela con el vendedor en turno", async () => {
    sales = [sale(4)];
    renderScreen({ id: "an", name: "Ana" });
    await userEvent.click(screen.getByLabelText("Ver ticket 0004"));
    await userEvent.click(screen.getByText("Cancelar venta"));
    const confirm = screen.getAllByText("Cancelar venta").at(-1)!;
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Motivo"), "   ");
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Motivo"), " Se arrepintió ");
    await userEvent.click(confirm);
    expect(cancelSale).toHaveBeenCalledWith("s4", "Se arrepintió", {
      id: "an",
      name: "Ana",
    });
    expect(retry).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sin vendedor en turno cancela sin `by`", async () => {
    sales = [sale(5)];
    renderScreen();
    await userEvent.click(screen.getByLabelText("Ver ticket 0005"));
    await userEvent.click(screen.getByText("Cancelar venta"));
    await userEvent.type(screen.getByLabelText("Motivo"), "Error");
    await userEvent.click(screen.getAllByText("Cancelar venta").at(-1)!);
    expect(cancelSale).toHaveBeenCalledWith("s5", "Error", undefined);
  });

  it("si falla la cancelación muestra el error y sigue abierta", async () => {
    cancelSale.mockRejectedValue(new Error("La venta ya está cancelada"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    sales = [sale(6)];
    renderScreen();
    await userEvent.click(screen.getByLabelText("Ver ticket 0006"));
    await userEvent.click(screen.getByText("Cancelar venta"));
    await userEvent.type(screen.getByLabelText("Motivo"), "Error");
    await userEvent.click(screen.getAllByText("Cancelar venta").at(-1)!);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La venta ya está cancelada",
    );
    expect(
      screen.getByRole("dialog", { name: "Cancelar venta #0006" }),
    ).toBeInTheDocument();
    expect(retry).not.toHaveBeenCalled();
  });
  it("shows a cashier only their own sales", () => {
    sales = [
      sale(1, { seller: { id: "lu", name: "Luis" } }),
      sale(2, { seller: { id: "an", name: "Ana" } }),
      sale(3),
    ];
    renderScreen({ id: "lu", name: "Luis" }, "cashier");
    expect(screen.getByText("#0001")).toBeInTheDocument();
    expect(screen.queryByText("#0002")).toBeNull();
    expect(screen.queryByText("#0003")).toBeNull();
  });

  it("shows the owner every sale", () => {
    sales = [
      sale(1, { seller: { id: "lu", name: "Luis" } }),
      sale(2, { seller: { id: "an", name: "Ana" } }),
    ];
    renderScreen({ id: "ro", name: "Rodrigo" }, "owner");
    expect(screen.getByText("#0001")).toBeInTheDocument();
    expect(screen.getByText("#0002")).toBeInTheDocument();
  });
});
