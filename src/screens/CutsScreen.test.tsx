import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";
import type { Shift } from "@/lib/shifts";
import { CutsScreen } from "@/screens/CutsScreen";

const { useShiftsRange, downloadCutsPdf, downloadCutsXlsx } = vi.hoisted(
  () => ({
    useShiftsRange: vi.fn(),
    downloadCutsPdf: vi.fn(),
    downloadCutsXlsx: vi.fn(),
  }),
);

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("@/hooks/useShiftsRange", () => ({ useShiftsRange }));
vi.mock("@/lib/cutsExport", () => ({ downloadCutsPdf, downloadCutsXlsx }));

const at = (h: number) => Timestamp.fromDate(new Date(2026, 10, 1, h, 0));

const closed = (
  id: string,
  sellerId: string,
  difference: number,
  withdrawals: Shift["withdrawals"] = [],
): Shift => ({
  id,
  seller: { id: sellerId, name: sellerId.toUpperCase() },
  openedAt: at(9),
  openingFloat: 500,
  withdrawals,
  closedAt: at(17),
  cut: {
    tickets: 3,
    total: 900,
    byMethod: { Efectivo: 600, Tarjeta: 200, "Transfer.": 100 },
    expected: 1000,
    counted: 1000 + difference,
    difference,
  },
});

const open: Shift = {
  id: "o1",
  seller: { id: "c", name: "C" },
  openedAt: at(10),
  openingFloat: 300,
  withdrawals: [],
};

const shifts = [
  closed("1", "a", -150),
  closed("2", "a", 80, [{ amount: 200, reason: "Gas", at: at(12) }]),
  closed("3", "b", 0),
  open,
];

const setup = (state = {}) => {
  useShiftsRange.mockReturnValue({
    shifts,
    loading: false,
    error: null,
    retry: () => {},
    ...state,
  });
  return render(<CutsScreen onBack={() => {}} />);
};

const netCard = () => screen.getByText("Neto").parentElement!;

describe("CutsScreen", () => {
  it("shows a chip per shift", () => {
    setup();
    expect(screen.getAllByText("Faltan $150").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sobran $80").length).toBeGreaterThan(0);
    expect(screen.getByText("Cuadra")).toBeInTheDocument();
    expect(screen.getByText("Abierto")).toBeInTheDocument();
  });

  it("summarizes the period without counting open shifts", () => {
    setup();
    const cards = screen.getByText("Con diferencia").parentElement!;
    expect(within(cards).getByText("2")).toBeInTheDocument();
    expect(within(netCard()).getByText("−$70")).toBeInTheDocument();
  });

  it("filters by difference and open shifts without changing the summary", async () => {
    setup();
    await userEvent.click(
      screen.getByRole("switch", { name: "Solo con diferencia" }),
    );
    expect(screen.queryByText("Cuadra")).not.toBeInTheDocument();
    expect(screen.queryByText("Abierto")).not.toBeInTheDocument();
    expect(within(netCard()).getByText("−$70")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("switch", { name: "Solo abiertos" }),
    );
    expect(screen.getByText("Abierto")).toBeInTheDocument();
    expect(screen.queryByText("Sobran $80")).not.toBeInTheDocument();
  });

  it("filters by seller", async () => {
    setup();
    await userEvent.selectOptions(screen.getByLabelText("Vendedor"), "b");
    expect(screen.getByText("Cuadra")).toBeInTheDocument();
    expect(screen.queryByText("Abierto")).not.toBeInTheDocument();
  });

  it("opens the shift detail with withdrawals", async () => {
    setup();
    const rows = screen.getAllByRole("button", { name: "Ver turno de A" });
    await userEvent.click(rows[1]);
    const dialog = screen.getByRole("dialog", { name: "Detalle del turno" });
    expect(within(dialog).getByText(/Gas/)).toBeInTheDocument();
    expect(within(dialog).getByText("Sobran $80")).toBeInTheDocument();
    expect(within(dialog).getByText("Esperado")).toBeInTheDocument();
  });

  it("shows only fund and withdrawals for an open shift", async () => {
    setup({ shifts: [open] });
    await userEvent.click(
      screen.getByRole("button", { name: "Ver turno de C" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Detalle del turno" });
    expect(within(dialog).getByText("Fondo inicial")).toBeInTheDocument();
    expect(within(dialog).queryByText("Esperado")).not.toBeInTheDocument();
  });

  it("shows empty, loading and error states", () => {
    const { unmount } = setup({ shifts: [] });
    expect(screen.getByText("Sin turnos en este periodo.")).toBeInTheDocument();
    unmount();
    setup({ error: new Error("x"), shifts: [] });
    expect(
      screen.getByRole("button", { name: /reintentar/i }),
    ).toBeInTheDocument();
  });

  it("does not query with an invalid range", async () => {
    setup({ shifts: [] });
    await userEvent.click(screen.getByRole("button", { name: "Rango" }));
    const from = screen.getByLabelText("Desde");
    await userEvent.clear(from);
    expect(useShiftsRange).toHaveBeenLastCalledWith(null, false);
  });

  it("exports the visible shifts to PDF and Excel", async () => {
    downloadCutsPdf.mockResolvedValue(undefined);
    downloadCutsXlsx.mockResolvedValue(undefined);
    setup();
    await userEvent.click(
      screen.getByRole("switch", { name: "Solo con diferencia" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "PDF" }));
    expect(downloadCutsPdf).toHaveBeenCalledTimes(1);
    expect(
      downloadCutsPdf.mock.calls[0][0].shifts.map((s: Shift) => s.id),
    ).toEqual(["1", "2"]);
    await userEvent.click(screen.getByRole("button", { name: "Excel" }));
    expect(downloadCutsXlsx).toHaveBeenCalledTimes(1);
  });

  it("disables export without visible shifts, on error or with an invalid range", async () => {
    const { unmount } = setup({ shifts: [] });
    expect(screen.getByRole("button", { name: "PDF" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Excel" })).toBeDisabled();
    unmount();
    const err = setup({ error: new Error("x") });
    expect(screen.getByRole("button", { name: "PDF" })).toBeDisabled();
    err.unmount();
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Rango" }));
    await userEvent.clear(screen.getByLabelText("Desde"));
    expect(screen.getByRole("button", { name: "Excel" })).toBeDisabled();
  });

  it("shows Generando… and an error message when generation fails", async () => {
    let reject!: (e: Error) => void;
    downloadCutsXlsx.mockReturnValue(
      new Promise((_, r) => {
        reject = r;
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Excel" }));
    expect(screen.getByRole("button", { name: "Generando…" })).toBeDisabled();
    reject(new Error("boom"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo generar el archivo. Inténtalo de nuevo.",
    );
    expect(screen.getByRole("button", { name: "Excel" })).toBeEnabled();
  });
});
