import {
  collection,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  where,
  type QuerySnapshot,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import type { DateRange } from "@/lib/reports";
import type { Sale } from "@/lib/sales";

interface State {
  key: string;
  sales: Sale[];
  error: Error | null;
}

const toSales = (snapshot: QuerySnapshot): Sale[] =>
  snapshot.docs
    .flatMap((d) => {
      const data = d.data({ serverTimestamps: "estimate" });
      if (
        !(data.createdAt instanceof Timestamp) ||
        !Array.isArray(data.lines) ||
        typeof data.total !== "number"
      ) {
        return [];
      }
      return [{ ...data, id: d.id } as Sale];
    })
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

export const useSalesList = (range: DateRange | null, live: boolean) => {
  const startMs = range?.start.getTime();
  const endMs = range?.end.getTime();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({
    key: "",
    sales: [],
    error: null,
  });
  const key =
    startMs === undefined || endMs === undefined
      ? ""
      : `${startMs}-${endMs}-${live}-${attempt}`;

  useEffect(() => {
    if (startMs === undefined || endMs === undefined) return;
    const sales = query(
      collection(db, "sales"),
      where("createdAt", ">=", Timestamp.fromMillis(startMs)),
      where("createdAt", "<", Timestamp.fromMillis(endMs)),
    );
    const fail = (error: Error) => setState({ key, sales: [], error });
    const done = (snapshot: QuerySnapshot) =>
      setState({ key, sales: toSales(snapshot), error: null });

    if (live) return onSnapshot(sales, done, fail);

    let cancelled = false;
    getDocs(sales)
      .then((snapshot) => !cancelled && done(snapshot))
      .catch((error: Error) => !cancelled && fail(error));
    return () => {
      cancelled = true;
    };
  }, [startMs, endMs, live, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const current = key !== "" && state.key === key;
  return {
    sales: current ? state.sales : [],
    loading: key !== "" && !current,
    error: current ? state.error : null,
    retry,
  };
};
