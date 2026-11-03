import type { Shift, ShiftCut } from "@/lib/shifts";

export interface ShiftFilters {
  sellerId: string | null;
  onlyDifference: boolean;
  onlyOpen: boolean;
}

export interface CutTotals {
  closed: number;
  withDifference: number;
  shortage: number;
  surplus: number;
  net: number;
}

export interface SellerCutTotals extends CutTotals {
  seller: { id: string; name: string };
}

type ClosedShift = Shift & { cut: ShiftCut };

// Sin closedAt o sin cut cuenta como abierto y nunca entra en los totales.
export const isOpenShift = (shift: Pick<Shift, "closedAt" | "cut">) =>
  !shift.closedAt || !shift.cut;

const isClosed = (shift: Shift): shift is ClosedShift => !isOpenShift(shift);

export const summarize = (shifts: Shift[]): CutTotals => {
  let withDifference = 0;
  let shortage = 0;
  let surplus = 0;
  let closed = 0;
  for (const shift of shifts) {
    if (!isClosed(shift)) continue;
    closed += 1;
    const { difference } = shift.cut;
    if (difference === 0) continue;
    withDifference += 1;
    if (difference < 0) shortage -= difference;
    else surplus += difference;
  }
  return { closed, withDifference, shortage, surplus, net: surplus - shortage };
};

export const sellersOf = (shifts: Shift[]) => {
  const byId = new Map<string, { id: string; name: string }>();
  for (const { seller } of shifts) {
    if (!byId.has(seller.id)) byId.set(seller.id, seller);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export const summarizeBySeller = (shifts: Shift[]): SellerCutTotals[] =>
  sellersOf(shifts)
    .map((seller) => ({
      seller,
      ...summarize(shifts.filter((s) => s.seller.id === seller.id)),
    }))
    .sort(
      (a, b) =>
        b.shortage - a.shortage || a.seller.name.localeCompare(b.seller.name),
    );

export const filterShifts = (shifts: Shift[], filters: ShiftFilters) =>
  shifts.filter((shift) => {
    if (filters.sellerId && shift.seller.id !== filters.sellerId) return false;
    if (filters.onlyOpen) return isOpenShift(shift);
    if (filters.onlyDifference)
      return isClosed(shift) && shift.cut.difference !== 0;
    return true;
  });
