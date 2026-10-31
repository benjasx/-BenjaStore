import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { categories, type Product } from "@/data/mock";
import { db } from "@/lib/firebase";

interface State {
  products: Product[];
  loading: boolean;
  error: Error | null;
}

const byCategoryThenName = (a: Product, b: Product) =>
  categories.indexOf(a.category) - categories.indexOf(b.category) ||
  a.name.localeCompare(b.name);

export const useProducts = () => {
  const [state, setState] = useState<State>({
    products: [],
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "products"),
        (snapshot) =>
          setState({
            products: snapshot.docs
              .map((d) => ({ ...(d.data() as Omit<Product, "id">), id: d.id }))
              .sort(byCategoryThenName),
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

  const addProduct = (product: Omit<Product, "id">) =>
    addDoc(collection(db, "products"), product);

  const setSoldOut = (id: string, soldOut: boolean) =>
    updateDoc(doc(db, "products", id), { soldOut });

  return { ...state, retry, addProduct, setSoldOut };
};
