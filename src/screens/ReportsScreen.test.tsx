import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DateRange, ReportSale } from "@/lib/reports";
import type { SaleLine } from "@/lib/sales";
import { ReportsScreen } from "@/screens/ReportsScreen";

const { useSalesRange, downloadReportPdf } = vi.hoisted(() => ({
  useSalesRange: vi.fn(),
  downloadReportPdf: vi.fn(),
}));

vi.mock("@/hooks/useSalesRange", () => ({ useSalesRange }));
vi.mock("@/lib/reportPdf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/reportPdf")>()),
  downloadReportPdf,
}));

const d = (month: number, day: number, hour = 12) =>
  new Date(2026, month - 1, day, hour, 0);

const line = (overrides: Partial<SaleLine>): SaleLine => ({
  kind: "product",
  itemId: "burrito",
  name: "burrito",
  qty: 1,
  unitPrice: 100,
  gross: 100,
  saving: 0,
  extras: 0,
  ...overrides,
});

const sale = (
  createdAt: Date,
  total: number,
  overrides: Partial<ReportSale> = {},
): ReportSale => ({
  createdAt,
  channel: "Mostrador",
  lines: [line({})],
  saleSaving: 0,
  total,
  ...overrides,
});

const todaySales: ReportSale[] = [
  sale(d(10, 28, 19), 100, {
    lines: [
      line({
        qty: 2,
        saving: 20,
        sauces: { included: ["bbq"], extra: [{ name: "bbq", price: 10 }] },
      }),
    ],
  }),
  sale(d(10, 28, 20), 150, {
    channel: "WhatsApp",
    saleSaving: 10,
    lines: [
      line({
        kind: "combo",
        itemId: "c1",
        name: "combo uno",
        sauces: { included: ["bbq", "ranch"], extra: [] },
      }),
    ],
  }),
];
const lastWednesday = sale(d(10, 21, 14), 200);
const monday = sale(d(10, 26, 13), 300);

let all: ReportSale[] = [];
const retry = vi.fn();

const inRange = (range: DateRange | null) =>
  range
    ? all.filter((s) => s.createdAt >= range.start && s.createdAt < range.end)
    : [];

describe("ReportsScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 28, 20, 30));
    all = [...todaySales, lastWednesday, monday];
    retry.mockReset();
    downloadReportPdf.mockReset();
    downloadReportPdf.mockResolvedValue(undefined);
    useSalesRange.mockReset();
    useSalesRange.mockImplementation((range: DateRange | null) => ({
      sales: inRange(range),
      loading: false,
      error: null,
      retry,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes today's report from the sales", () => {
    all = [...todaySales, lastWednesday];
    render(<ReportsScreen onNavigate={() => {}} />);
    expect(screen.getByText("$250")).toBeInTheDocument();
    expect(screen.getByText("Tickets").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("Ticket promedio").nextSibling).toHaveTextContent(
      "$125",
    );
    expect(
      screen.getByText("+25% vs. miércoles pasado ($200)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ventas por hora")).toBeInTheDocument();
    expect(screen.getByText("Pico 20:00")).toBeInTheDocument();
    expect(screen.getByText("Ventas · miércoles 28 oct")).toBeInTheDocument();
  });

  it("lists top items, sauces, channels and discounts", () => {
    render(<ReportsScreen onNavigate={() => {}} />);
    expect(screen.getByText("combo uno")).toBeInTheDocument();
    expect(screen.getByText("bbq 75%")).toBeInTheDocument();
    expect(screen.getByText("ranch 25%")).toBeInTheDocument();
    expect(screen.getByText("$100 · 1")).toBeInTheDocument();
    expect(screen.getByText("$150 · 1")).toBeInTheDocument();
    expect(screen.getAllByText("$0 · 0")).toHaveLength(2);
    expect(screen.getByText("2 · −$30")).toBeInTheDocument();
    expect(screen.queryByText(/cancelaciones/i)).toBeNull();
  });

  it("shows zeros and a message when there are no sales", () => {
    all = [];
    render(<ReportsScreen onNavigate={() => {}} />);
    expect(screen.getByText("Sin ventas en este periodo.")).toBeInTheDocument();
    expect(screen.getByText("Tickets").nextSibling).toHaveTextContent("0");
    expect(screen.queryByText(/vs\./)).toBeNull();
    expect(screen.queryByText("$8,420")).toBeNull();
  });

  it("shows the negative change with a minus sign", () => {
    all = [sale(d(10, 28, 20), 100), lastWednesday];
    render(<ReportsScreen onNavigate={() => {}} />);
    expect(
      screen.getByText("−50% vs. miércoles pasado ($200)"),
    ).toBeInTheDocument();
  });

  it("shows a loading state without cards", () => {
    useSalesRange.mockImplementation(() => ({
      sales: [],
      loading: true,
      error: null,
      retry,
    }));
    render(<ReportsScreen onNavigate={() => {}} />);
    expect(screen.queryByText("Más vendidos")).toBeNull();
    expect(screen.queryByText("Ventas por hora")).toBeNull();
  });

  it("shows the error banner and retries", async () => {
    useSalesRange.mockImplementation(() => ({
      sales: [],
      loading: false,
      error: new Error("offline"),
      retry,
    }));
    const user = userEvent.setup();
    render(<ReportsScreen onNavigate={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las ventas.",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalled();
  });

  it("switches to the weekly report by day", async () => {
    const user = userEvent.setup();
    render(<ReportsScreen onNavigate={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Semana" }));
    expect(screen.getByText("Ventas por día")).toBeInTheDocument();
    expect(screen.getByText("$550")).toBeInTheDocument();
    expect(screen.getByText("Pico 26 oct")).toBeInTheDocument();
    expect(
      screen.getByText("+175% vs. semana anterior ($200)"),
    ).toBeInTheDocument();
    const [weekRange, live] = useSalesRange.mock.calls.at(-2)!;
    expect((weekRange as DateRange).start).toEqual(d(10, 26, 0));
    expect(live).toBe(false);
  });

  it("does not query for an invalid range", async () => {
    const user = userEvent.setup();
    render(<ReportsScreen onNavigate={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Rango" }));
    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2026-10-30" },
    });
    fireEvent.change(screen.getByLabelText("Hasta"), {
      target: { value: "2026-10-28" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Elige un rango válido de hasta 92 días.",
    );
    expect(useSalesRange).toHaveBeenLastCalledWith(null, false);
  });

  it("includes the end date of a custom range", async () => {
    const user = userEvent.setup();
    render(<ReportsScreen onNavigate={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Rango" }));
    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2026-10-26" },
    });
    expect(screen.getByText("$550")).toBeInTheDocument();
    expect(screen.getByText("Ventas por día")).toBeInTheDocument();
  });
  it("offers the four PDF reports and downloads the chosen one", async () => {
    const user = userEvent.setup();
    render(<ReportsScreen onNavigate={() => {}} />);
    await user.click(screen.getByRole("button", { name: "PDF" }));
    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual([
      "Productos más vendidos",
      "Ventas por hora",
      "Total de tickets",
      "Reporte general",
    ]);
    await user.click(screen.getByRole("menuitem", { name: "Reporte general" }));
    expect(downloadReportPdf).toHaveBeenCalledTimes(1);
    const [kind, sales, range, label] = downloadReportPdf.mock.calls[0];
    expect(kind).toBe("general");
    expect(sales).toHaveLength(2);
    expect((range as DateRange).start).toEqual(d(10, 28, 0));
    expect(label).toBe("miércoles 28 oct");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("shows Generando… while the PDF is being created", async () => {
    let finish: () => void = () => {};
    downloadReportPdf.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<ReportsScreen onNavigate={() => {}} />);
    await user.click(screen.getByRole("button", { name: "PDF" }));
    await user.click(
      screen.getByRole("menuitem", { name: "Total de tickets" }),
    );
    expect(screen.getByRole("button", { name: "Generando…" })).toBeDisabled();
    finish();
    expect(await screen.findByRole("button", { name: "PDF" })).toBeEnabled();
  });

  it("shows an error when the PDF cannot be generated", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    downloadReportPdf.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<ReportsScreen onNavigate={() => {}} />);
    await user.click(screen.getByRole("button", { name: "PDF" }));
    await user.click(screen.getByRole("menuitem", { name: "Ventas por hora" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo generar el PDF.",
    );
    consoleError.mockRestore();
  });

  it("disables the PDF button while loading or with an invalid range", async () => {
    useSalesRange.mockImplementation(() => ({
      sales: [],
      loading: true,
      error: null,
      retry,
    }));
    const { unmount } = render(<ReportsScreen onNavigate={() => {}} />);
    expect(screen.getByRole("button", { name: "PDF" })).toBeDisabled();
    unmount();

    useSalesRange.mockImplementation(() => ({
      sales: [],
      loading: false,
      error: null,
      retry,
    }));
    const user = userEvent.setup();
    render(<ReportsScreen onNavigate={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Rango" }));
    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2026-10-30" },
    });
    fireEvent.change(screen.getByLabelText("Hasta"), {
      target: { value: "2026-10-28" },
    });
    expect(screen.getByRole("button", { name: "PDF" })).toBeDisabled();
  });
});
