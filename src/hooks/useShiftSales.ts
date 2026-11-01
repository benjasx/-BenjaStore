import { collection, getDocs, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import type { Sale } from "@/lib/sales";

interface State {
  key: string;
  sales: Sale[];
  error: Error | null;
}

export const useShiftSales = (shiftId: string | null) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({
    key: "",
    sales: [],
    error: null,
  });
  const key = shiftId ? `${shiftId}-${attempt}` : "";

  useEffect(() => {
    if (!shiftId) return;
    let cancelled = false;
    getDocs(query(collection(db, "sales"), where("shiftId", "==", shiftId)))
      .then((snap) => {
        if (cancelled) return;
        const sales = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Sale);
        setState({ key, sales, error: null });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ key, sales: [], error });
      });
    return () => {
      cancelled = true;
    };
  }, [shiftId, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const current = key !== "" && state.key === key;
  return {
    sales: current ? state.sales : [],
    loading: key !== "" && !current,
    error: current ? state.error : null,
    retry,
  };
};
