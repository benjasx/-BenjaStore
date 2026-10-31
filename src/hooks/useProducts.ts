import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/data/mock";
import { db } from "@/lib/firebase";
import { normalizeName } from "@/lib/text";

interface State {
  products: Product[];
  loading: boolean;
  error: Error | null;
}

const byName = (a: Product, b: Product) => a.name.localeCompare(b.name);

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

  const addProduct = (product: Omit<Product, "id">) =>
    addDoc(collection(db, "products"), {
      ...product,
      name: normalizeName(product.name),
    });

  const setSoldOut = (id: string, soldOut: boolean) =>
    updateDoc(doc(db, "products", id), { soldOut });

  const updateProduct = async (
    id: string,
    changes: {
      name: string;
      price: number;
      description: string;
      image?: string;
    },
  ) => {
    const name = normalizeName(changes.name);
    const description = changes.description.trim();
    if (!name || !(changes.price >= 0)) return;
    await updateDoc(doc(db, "products", id), {
      name,
      price: changes.price,
      description: description || deleteField(),
      image: changes.image ?? deleteField(),
    });
  };

  const deleteProduct = (id: string) => deleteDoc(doc(db, "products", id));

  return {
    ...state,
    retry,
    addProduct,
    setSoldOut,
    updateProduct,
    deleteProduct,
  };
};
