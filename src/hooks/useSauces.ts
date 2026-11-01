import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { normalizeName } from "@/lib/text";

export interface Sauce {
  id: string;
  name: string;
  extraPrice: number;
  enabled: boolean;
}

export interface SauceInput {
  name: string;
  extraPrice: number;
}

interface State {
  sauces: Sauce[];
  loading: boolean;
  error: Error | null;
}

const byName = (a: Sauce, b: Sauce) => a.name.localeCompare(b.name);

const isValid = (name: string, input: SauceInput) =>
  !!name && Number.isInteger(input.extraPrice) && input.extraPrice >= 0;

export const useSauces = () => {
  const [state, setState] = useState<State>({
    sauces: [],
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "sauces"),
        (snapshot) =>
          setState({
            sauces: snapshot.docs
              .map((d) => ({ ...(d.data() as Omit<Sauce, "id">), id: d.id }))
              .sort(byName),
            loading: false,
            error: null,
          }),
        (error) => setState((s) => ({ ...s, loading: false, error })),
      ),
    [attempt],
  );

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setAttempt((n) => n + 1);
  }, []);

  const createSauce = async (input: SauceInput) => {
    const name = normalizeName(input.name);
    if (!isValid(name, input)) return;
    await addDoc(collection(db, "sauces"), {
      name,
      extraPrice: input.extraPrice,
      enabled: true,
    });
  };

  const updateSauce = async (id: string, changes: SauceInput) => {
    const name = normalizeName(changes.name);
    if (!isValid(name, changes)) return;
    await updateDoc(doc(db, "sauces", id), {
      name,
      extraPrice: changes.extraPrice,
    });
  };

  const deleteSauce = (id: string) => deleteDoc(doc(db, "sauces", id));

  const setSauceEnabled = (id: string, enabled: boolean) =>
    updateDoc(doc(db, "sauces", id), { enabled });

  return {
    ...state,
    retry,
    createSauce,
    updateSauce,
    deleteSauce,
    setSauceEnabled,
  };
};
