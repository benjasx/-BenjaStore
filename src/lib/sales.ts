import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  COMBO_KEY_PREFIX,
  parseLineKey,
  type CartLine,
  type CartTotals,
} from "@/lib/pricing";

export type PaymentMethod = "Efectivo" | "Tarjeta" | "Transfer.";

export interface Payment {
  method: PaymentMethod;
  received?: number;
  reference?: string;
}

export interface SaleLine {
  kind: "product" | "combo";
  itemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  gross: number;
  saving: number;
  promotionName?: string;
  contents?: string;
  sauces?: CartLine["sauces"];
  extras: number;
}

export interface Sale {
  id: string;
  folio: number;
  createdAt: Timestamp;
  channel: string;
  lines: SaleLine[];
  subtotal: number;
  saleSaving: number;
  saleName?: string;
  total: number;
  paymentMethod: PaymentMethod;
  received?: number;
  change?: number;
  reference?: string;
}

export type SaleData = Omit<Sale, "id" | "folio" | "createdAt">;

export const formatFolio = (folio: number) => String(folio).padStart(4, "0");

interface BuildSaleInput {
  totals: CartTotals;
  channel: string;
  payment: Payment;
  comboContents: (comboId: string) => string | undefined;
}

const buildLine = (
  line: CartLine,
  comboContents: BuildSaleInput["comboContents"],
): SaleLine => {
  const { baseKey } = parseLineKey(line.key);
  const isCombo = baseKey.startsWith(COMBO_KEY_PREFIX);
  const itemId = isCombo ? baseKey.slice(COMBO_KEY_PREFIX.length) : baseKey;
  const contents = isCombo ? comboContents(itemId) : undefined;
  return {
    kind: isCombo ? "combo" : "product",
    itemId,
    name: line.name,
    qty: line.qty,
    unitPrice: line.unitPrice,
    gross: line.gross,
    saving: line.saving,
    ...(line.promotionName && { promotionName: line.promotionName }),
    ...(contents && { contents }),
    ...(line.sauces && { sauces: line.sauces }),
    extras: line.extras,
  };
};

export const buildSale = ({
  totals,
  channel,
  payment,
  comboContents,
}: BuildSaleInput): SaleData => {
  const cash = payment.method === "Efectivo";
  const received = cash ? (payment.received ?? totals.total) : undefined;
  return {
    channel,
    lines: totals.lines.map((l) => buildLine(l, comboContents)),
    subtotal: totals.subtotal,
    saleSaving: totals.saleSaving,
    ...(totals.saleName && { saleName: totals.saleName }),
    total: totals.total,
    paymentMethod: payment.method,
    ...(received !== undefined && {
      received,
      change: Math.max(received - totals.total, 0),
    }),
    ...(!cash &&
      payment.reference?.trim() && { reference: payment.reference.trim() }),
  };
};

export const createSale = async (data: SaleData): Promise<Sale> => {
  const counterRef = doc(db, "counters", "sales");
  const saleRef = doc(collection(db, "sales"));
  const folio = await runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef);
    const next = (counter.exists() ? (counter.data().last as number) : 0) + 1;
    tx.set(counterRef, { last: next });
    tx.set(saleRef, { ...data, folio: next, createdAt: serverTimestamp() });
    return next;
  });
  return { ...data, id: saleRef.id, folio, createdAt: Timestamp.now() };
};
