import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Timestamp } from "firebase/firestore";
import type { Sale } from "@/lib/sales";
import { buildCut, type Shift } from "@/lib/shifts";
import { ShiftCloseScreen } from "@/screens/ShiftCloseScreen";

const { useShiftSales, addWithdrawal, closeShift } = vi.hoisted(() => ({
  useShiftSales: vi.fn(),
  addWithdrawal: vi.fn(),
  closeShift: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("@/hooks/useShiftSales", () => ({ useShiftSales }));
vi.mock("@/lib/shifts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/shifts")>()),
  addWithdrawal,
  closeShift,
}));

const shift: Shift = {
  id: "sh1",
  seller: { id: "lu", name: "Luis" },
  openedAt: Timestamp.fromDate(new Date(2026, 10, 1, 9, 0)),
  openingFloat: 500,
  withdrawals: [],
};

const sale = (
  total: number,
  paymentMethod: Sale["paymentMethod"],
  cancelled = false,
) =>
  ({
    id: `s${total}`,
    total,
    paymentMethod,
    ...(cancelled && {
      cancelled: { at: Timestamp.now(), reason: "x" },
    }),
  }) as Sale;

const sales = [
  sale(400, "Efectivo"),
  sale(100, "Tarjeta"),
  sale(999, "Efectivo", true),
];

const setup = (props: Partial<Parameters<typeof ShiftCloseScreen>[0]> = {}) =>
  render(
    <ShiftCloseScreen
      shift={shift}
      onBack={() => {}}
      onWithdrawal={() => {}}
      onExit={() => {}}
      {...props}
    />,
  );

describe("ShiftCloseScreen", () => {
  beforeEach(() => {
    useShiftSales.mockReset();
    addWithdrawal.mockReset();
    closeShift.mockReset();
    useShiftSales.mockReturnValue({
      sales,
      loading: false,
      error: null,
      retry: () => {},
    });
  });

  it("shows real totals without cancelled sales", () => {
    setup();
    expect(screen.getByText(/Luis · .* · 2 tickets/)).toBeInTheDocument();
    expect(screen.getAllByText("$500")).toHaveLength(2);
    expect(screen.getAllByText("$900").length).toBeGreaterThan(0);
    expect(screen.queryByText(/999/)).toBeNull();
  });

  it("shows a message when there is no open shift", () => {
    setup({ shift: null });
    expect(screen.getByText(/no hay un turno abierto/i)).toBeInTheDocument();
  });

  it("shows an error banner and blocks closing on read error", () => {
    useShiftSales.mockReturnValue({
      sales: [],
      loading: false,
      error: new Error("x"),
      retry: () => {},
    });
    setup();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar turno" })).toBeDisabled();
  });

  it("keeps closing disabled until cash is counted and shows the difference", async () => {
    const user = userEvent.setup();
    setup();
    const close = screen.getByRole("button", { name: "Cerrar turno" });
    expect(close).toBeDisabled();
    await user.type(screen.getByLabelText("Efectivo contado"), "850");
    expect(close).toBeEnabled();
    expect(screen.getByText("Faltan $50")).toBeInTheDocument();
  });

  it("closes with a difference and shows the final summary", async () => {
    closeShift.mockImplementation(async (_id: string, counted: number) =>
      buildCut(shift, sales, counted),
    );
    const onExit = vi.fn();
    const user = userEvent.setup();
    setup({ onExit });
    await user.type(screen.getByLabelText("Efectivo contado"), "850");
    await user.click(screen.getByRole("button", { name: "Cerrar turno" }));
    expect(closeShift).toHaveBeenCalledWith("sh1", 850);
    expect(
      await screen.findByRole("heading", { name: "Turno cerrado" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Faltan")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salir" }));
    expect(onExit).toHaveBeenCalled();
  });

  it("shows the error and stays when closing fails", async () => {
    closeShift.mockRejectedValue(new Error("El turno ya está cerrado"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText("Efectivo contado"), "900");
    await user.click(screen.getByRole("button", { name: "Cerrar turno" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El turno ya está cerrado",
    );
    expect(screen.queryByText("Turno cerrado")).toBeNull();
  });

  it("registers a withdrawal and reports it", async () => {
    const w = { amount: 200, reason: "proveedor", at: Timestamp.now() };
    addWithdrawal.mockResolvedValue(w);
    const onWithdrawal = vi.fn();
    const user = userEvent.setup();
    setup({ onWithdrawal });
    await user.click(screen.getByRole("button", { name: "Retiro" }));
    const sheet = screen.getByRole("dialog", { name: "Retiro de efectivo" });
    const submit = within(sheet).getByRole("button", {
      name: "Registrar retiro",
    });
    expect(submit).toBeDisabled();
    await user.type(within(sheet).getByLabelText("Monto"), "901");
    await user.type(within(sheet).getByLabelText("Motivo"), "proveedor");
    expect(submit).toBeDisabled();
    await user.clear(within(sheet).getByLabelText("Monto"));
    await user.type(within(sheet).getByLabelText("Monto"), "200");
    await user.click(submit);
    expect(addWithdrawal).toHaveBeenCalledWith("sh1", 200, "proveedor");
    expect(onWithdrawal).toHaveBeenCalledWith(w);
  });

  it("lists existing withdrawals and lowers the expected cash", () => {
    setup({
      shift: {
        ...shift,
        withdrawals: [
          { amount: 200, reason: "proveedor", at: Timestamp.now() },
        ],
      },
    });
    expect(screen.getByText(/proveedor/)).toBeInTheDocument();
    expect(screen.getByText("$700")).toBeInTheDocument();
  });
});
