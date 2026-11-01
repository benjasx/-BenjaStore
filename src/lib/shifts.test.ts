import { Timestamp } from "firebase/firestore";
import {
  buildCut,
  expectedCash,
  isValidCounted,
  isValidOpeningFloat,
  isValidWithdrawalAmount,
  normalizeWithdrawalReason,
} from "@/lib/shifts";

vi.mock("@/lib/firebase", () => ({ db: {} }));

const w = (amount: number) => ({
  amount,
  reason: "x",
  at: Timestamp.now(),
});
const sale = (
  total: number,
  paymentMethod: "Efectivo" | "Tarjeta" | "Transfer.",
  cancelled = false,
) => ({
  total,
  paymentMethod,
  ...(cancelled && {
    cancelled: { at: Timestamp.now(), reason: "x" },
  }),
});

describe("shifts", () => {
  it("validates opening float", () => {
    expect(isValidOpeningFloat(0)).toBe(true);
    expect(isValidOpeningFloat(99999)).toBe(true);
    expect(isValidOpeningFloat(100000)).toBe(false);
    expect(isValidOpeningFloat(-1)).toBe(false);
    expect(isValidOpeningFloat(1.5)).toBe(false);
    expect(isValidOpeningFloat(NaN)).toBe(false);
  });

  it("validates counted cash", () => {
    expect(isValidCounted(0)).toBe(true);
    expect(isValidCounted(-1)).toBe(false);
    expect(isValidCounted(2.5)).toBe(false);
  });

  it("validates withdrawals", () => {
    expect(isValidWithdrawalAmount(100, 500)).toBe(true);
    expect(isValidWithdrawalAmount(500, 500)).toBe(true);
    expect(isValidWithdrawalAmount(0, 500)).toBe(false);
    expect(isValidWithdrawalAmount(501, 500)).toBe(false);
    expect(isValidWithdrawalAmount(1.5, 500)).toBe(false);
    expect(normalizeWithdrawalReason("  pago  ")).toBe("pago");
    expect(normalizeWithdrawalReason("   ")).toBeNull();
    expect(normalizeWithdrawalReason("a".repeat(61))).toBeNull();
    expect(normalizeWithdrawalReason("a".repeat(60))).toBe("a".repeat(60));
  });

  it("computes expected cash", () => {
    expect(
      expectedCash({ openingFloat: 500, withdrawals: [w(100), w(50)] }, 300),
    ).toBe(650);
  });

  it("builds an empty cut without sales", () => {
    const cut = buildCut({ openingFloat: 500, withdrawals: [] }, [], 500);
    expect(cut).toEqual({
      tickets: 0,
      total: 0,
      byMethod: { Efectivo: 0, Tarjeta: 0, "Transfer.": 0 },
      expected: 500,
      counted: 500,
      difference: 0,
    });
  });

  it("does not add card sales to expected cash", () => {
    const cut = buildCut(
      { openingFloat: 500, withdrawals: [] },
      [sale(200, "Tarjeta"), sale(100, "Transfer.")],
      500,
    );
    expect(cut.expected).toBe(500);
    expect(cut.total).toBe(300);
    expect(cut.tickets).toBe(2);
  });

  it("subtracts withdrawals and reports the difference", () => {
    const cut = buildCut(
      { openingFloat: 500, withdrawals: [w(200)] },
      [sale(400, "Efectivo"), sale(100, "Tarjeta")],
      650,
    );
    expect(cut.byMethod).toEqual({
      Efectivo: 400,
      Tarjeta: 100,
      "Transfer.": 0,
    });
    expect(cut.expected).toBe(700);
    expect(cut.difference).toBe(-50);
  });

  it("ignores cancelled sales", () => {
    const cut = buildCut(
      { openingFloat: 0, withdrawals: [] },
      [sale(400, "Efectivo"), sale(999, "Efectivo", true)],
      400,
    );
    expect(cut.tickets).toBe(1);
    expect(cut.total).toBe(400);
    expect(cut.expected).toBe(400);
    expect(cut.difference).toBe(0);
  });
});
