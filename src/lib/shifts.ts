import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isCancelled, type PaymentMethod, type Sale } from "@/lib/sales";

export const MAX_OPENING_FLOAT = 99999;
export const MAX_WITHDRAWAL_REASON = 60;

export interface Withdrawal {
  amount: number;
  reason: string;
  at: Timestamp;
}

export interface ShiftCut {
  tickets: number;
  total: number;
  byMethod: Record<PaymentMethod, number>;
  expected: number;
  counted: number;
  difference: number;
}

export interface Shift {
  id: string;
  seller: { id: string; name: string };
  openedAt: Timestamp;
  openingFloat: number;
  withdrawals: Withdrawal[];
  closedAt?: Timestamp;
  cut?: ShiftCut;
}

export const isValidOpeningFloat = (n: number) =>
  Number.isInteger(n) && n >= 0 && n <= MAX_OPENING_FLOAT;

export const isValidCounted = (n: number) => Number.isInteger(n) && n >= 0;

export const normalizeWithdrawalReason = (reason: string) => {
  const trimmed = reason.trim();
  return trimmed !== "" && trimmed.length <= MAX_WITHDRAWAL_REASON
    ? trimmed
    : null;
};

export const isValidWithdrawalAmount = (n: number, available: number) =>
  Number.isInteger(n) && n > 0 && n <= available;

export const isShiftClosed = (shift: Pick<Shift, "closedAt">) =>
  shift.closedAt !== undefined;

export const expectedCash = (
  shift: Pick<Shift, "openingFloat" | "withdrawals">,
  cashSales: number,
) =>
  shift.openingFloat +
  cashSales -
  shift.withdrawals.reduce((sum, w) => sum + w.amount, 0);

export const buildCut = (
  shift: Pick<Shift, "openingFloat" | "withdrawals">,
  sales: Pick<Sale, "total" | "paymentMethod" | "cancelled">[],
  counted: number,
): ShiftCut => {
  const byMethod: Record<PaymentMethod, number> = {
    Efectivo: 0,
    Tarjeta: 0,
    "Transfer.": 0,
  };
  let tickets = 0;
  for (const s of sales) {
    if (isCancelled(s)) continue;
    tickets += 1;
    byMethod[s.paymentMethod] += s.total;
  }
  const expected = expectedCash(shift, byMethod.Efectivo);
  return {
    tickets,
    total: byMethod.Efectivo + byMethod.Tarjeta + byMethod["Transfer."],
    byMethod,
    expected,
    counted,
    difference: counted - expected,
  };
};

const toShift = (id: string, data: DocumentData): Shift => ({
  id,
  seller: data.seller,
  openedAt: data.openedAt,
  openingFloat: data.openingFloat,
  withdrawals: data.withdrawals ?? [],
  ...(data.closedAt && { closedAt: data.closedAt }),
  ...(data.cut && { cut: data.cut }),
});

export const openShift = async (
  seller: { id: string; name: string },
  openingFloat: number,
): Promise<Shift> => {
  if (!isValidOpeningFloat(openingFloat)) throw new Error("Fondo inválido");
  const ref = doc(collection(db, "shifts"));
  const data = { seller, openingFloat, withdrawals: [] as Withdrawal[] };
  await setDoc(ref, { ...data, openedAt: serverTimestamp() });
  return { ...data, id: ref.id, openedAt: Timestamp.now() };
};

export const findOpenShift = async (
  sellerId: string,
): Promise<Shift | null> => {
  const snap = await getDocs(
    query(collection(db, "shifts"), where("seller.id", "==", sellerId)),
  );
  const open = snap.docs
    .map((d) => toShift(d.id, d.data({ serverTimestamps: "estimate" })))
    .filter((s) => !isShiftClosed(s))
    .sort((a, b) => b.openedAt.toMillis() - a.openedAt.toMillis());
  return open[0] ?? null;
};

export const addWithdrawal = async (
  shiftId: string,
  amount: number,
  reason: string,
): Promise<Withdrawal> => {
  const clean = normalizeWithdrawalReason(reason);
  if (!clean) throw new Error("Motivo inválido");
  const ref = doc(db, "shifts", shiftId);
  const withdrawal: Withdrawal = { amount, reason: clean, at: Timestamp.now() };
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("El turno no existe");
    if (snap.data().closedAt) throw new Error("El turno ya está cerrado");
    if (!Number.isInteger(amount) || amount <= 0)
      throw new Error("Monto inválido");
    tx.update(ref, { withdrawals: arrayUnion(withdrawal) });
  });
  return withdrawal;
};

export const closeShift = async (
  shiftId: string,
  counted: number,
): Promise<ShiftCut> => {
  if (!isValidCounted(counted)) throw new Error("Efectivo contado inválido");
  const ref = doc(db, "shifts", shiftId);
  // El SDK web no permite consultas dentro de una transacción: las ventas se
  // leen antes y la transacción valida que el turno siga abierto al escribir.
  const salesSnap = await getDocs(
    query(collection(db, "sales"), where("shiftId", "==", shiftId)),
  );
  const sales = salesSnap.docs.map((d) => d.data() as Sale);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("El turno no existe");
    const shift = toShift(snap.id, snap.data());
    if (isShiftClosed(shift)) throw new Error("El turno ya está cerrado");
    const cut = buildCut(shift, sales, counted);
    tx.update(ref, { closedAt: serverTimestamp(), cut });
    return cut;
  });
};
