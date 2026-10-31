import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { normalizeName } from "@/lib/text";

export interface Category {
  id: string;
  name: string;
  order: number;
  enabled: boolean;
}

interface State {
  categories: Category[];
  loading: boolean;
  error: Error | null;
}

const byOrderThenName = (a: Category, b: Category) =>
  a.order - b.order || a.name.localeCompare(b.name);

export const useCategories = () => {
  const [state, setState] = useState<State>({
    categories: [],
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "categories"),
        (snapshot) =>
          setState({
            categories: snapshot.docs
              .map((d) => ({ ...(d.data() as Omit<Category, "id">), id: d.id }))
              .sort(byOrderThenName),
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

  const createCategory = async (name: string) => {
    const trimmed = normalizeName(name);
    if (!trimmed) return;
    const order = Math.max(-1, ...state.categories.map((c) => c.order)) + 1;
    await addDoc(collection(db, "categories"), {
      name: trimmed,
      order,
      enabled: true,
    });
  };

  const renameCategory = async (id: string, name: string) => {
    const trimmed = normalizeName(name);
    if (!trimmed) return;
    await updateDoc(doc(db, "categories", id), { name: trimmed });
  };

  const setCategoryEnabled = (id: string, enabled: boolean) =>
    updateDoc(doc(db, "categories", id), { enabled });

  const moveCategory = async (id: string, direction: -1 | 1) => {
    const list = state.categories;
    const index = list.findIndex((c) => c.id === id);
    const other = list[index + direction];
    if (index < 0 || !other) return;
    const batch = writeBatch(db);
    batch.update(doc(db, "categories", id), { order: other.order });
    batch.update(doc(db, "categories", other.id), { order: list[index].order });
    await batch.commit();
  };

  return {
    ...state,
    retry,
    createCategory,
    renameCategory,
    setCategoryEnabled,
    moveCategory,
  };
};
