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
import type { Shift } from "@/lib/shifts";

interface State {
  key: string;
  shifts: Shift[];
  error: Error | null;
}

const toShifts = (snapshot: QuerySnapshot): Shift[] =>
  snapshot.docs
    .flatMap((d) => {
      const data = d.data({ serverTimestamps: "estimate" });
      if (
        !(data.openedAt instanceof Timestamp) ||
        typeof data.seller?.id !== "string" ||
        typeof data.openingFloat !== "number"
      ) {
        return [];
      }
      return [
        {
          id: d.id,
          seller: data.seller,
          openedAt: data.openedAt,
          openingFloat: data.openingFloat,
          withdrawals: data.withdrawals ?? [],
          ...(data.closedAt && { closedAt: data.closedAt }),
          ...(data.cut && { cut: data.cut }),
        } as Shift,
      ];
    })
    .sort((a, b) => b.openedAt.toMillis() - a.openedAt.toMillis());

export const useShiftsRange = (range: DateRange | null, live: boolean) => {
  const startMs = range?.start.getTime();
  const endMs = range?.end.getTime();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({
    key: "",
    shifts: [],
    error: null,
  });
  const key =
    startMs === undefined || endMs === undefined
      ? ""
      : `${startMs}-${endMs}-${live}-${attempt}`;

  useEffect(() => {
    if (startMs === undefined || endMs === undefined) return;
    const shifts = query(
      collection(db, "shifts"),
      where("openedAt", ">=", Timestamp.fromMillis(startMs)),
      where("openedAt", "<", Timestamp.fromMillis(endMs)),
    );
    const fail = (error: Error) => setState({ key, shifts: [], error });
    const done = (snapshot: QuerySnapshot) =>
      setState({ key, shifts: toShifts(snapshot), error: null });

    if (live) return onSnapshot(shifts, done, fail);

    let cancelled = false;
    getDocs(shifts)
      .then((snapshot) => !cancelled && done(snapshot))
      .catch((error: Error) => !cancelled && fail(error));
    return () => {
      cancelled = true;
    };
  }, [startMs, endMs, live, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const current = key !== "" && state.key === key;
  return {
    shifts: current ? state.shifts : [],
    loading: key !== "" && !current,
    error: current ? state.error : null,
    retry,
  };
};
