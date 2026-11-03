import { Timestamp } from "firebase/firestore";
import {
  filterShifts,
  isOpenShift,
  sellersOf,
  summarize,
  summarizeBySeller,
} from "@/lib/shiftHistory";
import type { Shift } from "@/lib/shifts";

const closed = (id: string, sellerId: string, difference: number): Shift => ({
  id,
  seller: { id: sellerId, name: sellerId.toUpperCase() },
  openedAt: Timestamp.now(),
  openingFloat: 0,
  withdrawals: [],
  closedAt: Timestamp.now(),
  cut: {
    tickets: 0,
    total: 0,
    byMethod: { Efectivo: 0, Tarjeta: 0, "Transfer.": 0 },
    expected: 0,
    counted: difference,
    difference,
  },
});
const open = (id: string, sellerId: string): Shift => ({
  id,
  seller: { id: sellerId, name: sellerId.toUpperCase() },
  openedAt: Timestamp.now(),
  openingFloat: 500,
  withdrawals: [],
});

const none = { sellerId: null, onlyDifference: false, onlyOpen: false };

describe("shiftHistory", () => {
  it("summarizes an empty list", () => {
    expect(summarize([])).toEqual({
      closed: 0,
      withDifference: 0,
      shortage: 0,
      surplus: 0,
      net: 0,
    });
  });

  it("ignores open shifts", () => {
    expect(summarize([open("1", "a")]).closed).toBe(0);
    expect(isOpenShift(open("1", "a"))).toBe(true);
    expect(isOpenShift(closed("2", "a", 0))).toBe(false);
  });

  it("keeps shortage and surplus separate", () => {
    const totals = summarize([
      closed("1", "a", -150),
      closed("2", "a", 80),
      closed("3", "a", 0),
      open("4", "a"),
    ]);
    expect(totals).toEqual({
      closed: 3,
      withDifference: 2,
      shortage: 150,
      surplus: 80,
      net: -70,
    });
  });

  it("summarizes by seller ordered by shortage then name", () => {
    const result = summarizeBySeller([
      closed("1", "b", -50),
      closed("2", "a", -200),
      closed("3", "c", 30),
      closed("4", "d", 10),
    ]);
    expect(result.map((r) => r.seller.id)).toEqual(["a", "b", "c", "d"]);
    expect(result[0].shortage).toBe(200);
  });

  it("lists unique sellers by name", () => {
    expect(
      sellersOf([closed("1", "b", 0), closed("2", "a", 0), open("3", "b")]),
    ).toEqual([
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ]);
  });

  it("filters by seller, difference and open", () => {
    const all = [
      closed("1", "a", -10),
      closed("2", "a", 0),
      closed("3", "b", 5),
      open("4", "a"),
    ];
    expect(filterShifts(all, none)).toHaveLength(4);
    expect(filterShifts(all, { ...none, sellerId: "a" })).toHaveLength(3);
    expect(
      filterShifts(all, { ...none, onlyDifference: true }).map((s) => s.id),
    ).toEqual(["1", "3"]);
    expect(
      filterShifts(all, { ...none, onlyOpen: true }).map((s) => s.id),
    ).toEqual(["4"]);
    expect(
      filterShifts(all, {
        sellerId: "a",
        onlyDifference: true,
        onlyOpen: false,
      }).map((s) => s.id),
    ).toEqual(["1"]);
  });
});
